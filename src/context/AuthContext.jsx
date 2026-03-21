import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../data/firebase';
import { createUserProfile, getUserProfile, updateUserProfile as updateUserProfileInFirestore, getInvitationsForEmail, addFriendLink, deleteInvitation, getInviteToken, useInviteToken } from '../data/firestore';

const AuthContext = createContext(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);          // firebase auth user
    const [userProfile, setUserProfile] = useState(null); // firestore profile
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingInviteToken, setPendingInviteToken] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log('Auth state changed - User:', firebaseUser.email, 'UID:', firebaseUser.uid);
                setUser(firebaseUser);
                // Fetch or create profile
                let profile = await getUserProfile(firebaseUser.uid);
                console.log('Profile lookup result:', profile);
                let isNewUser = false;
                if (!profile) {
                    // First login — create profile + seed data
                    isNewUser = true;
                    console.log('No profile found, creating new user profile...');
                    const name = firebaseUser.displayName || firebaseUser.email.split('@')[0];
                    try {
                        await createUserProfile(firebaseUser.uid, {
                            name,
                            email: firebaseUser.email,
                            avatar: null,
                        });
                        console.log('Profile created, fetching profile data...');
                        profile = await getUserProfile(firebaseUser.uid);
                        console.log('Profile created successfully');
                    } catch (err) {
                        console.error('Error creating profile:', err);
                        throw err;
                    }
                } else {
                    console.log('Existing profile found, not a new user');
                }
                setUserProfile(profile);

                // Process pending invitations for new users
                console.log('Checking isNewUser:', isNewUser, 'email:', firebaseUser.email);
                if (isNewUser && firebaseUser.email) {
                    console.log('Processing pending invitations for new user:', firebaseUser.email);
                    const invitationCount = await processPendingInvitations(firebaseUser.email, firebaseUser.uid);
                    console.log(`Processed ${invitationCount} pending friend invitations`);
                } else {
                    console.log('Skipping invitation processing - isNewUser:', isNewUser, 'email:', firebaseUser.email);
                }

                // Process invite token if present (for both new and existing users)
                // Check both state and sessionStorage
                const tokenToProcess = pendingInviteToken || sessionStorage.getItem('pendingInviteToken');
                if (tokenToProcess) {
                    console.log('Processing invite token:', tokenToProcess);
                    const success = await processInviteToken(tokenToProcess, firebaseUser.uid);
                    console.log('Invite token processing result:', success);
                    setPendingInviteToken(null);
                    sessionStorage.removeItem('pendingInviteToken');
                }
            } else {
                console.log('User logged out');
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const signup = useCallback(async (email, password, name) => {
        setError(null);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            // Profile + seed data created by onAuthStateChanged listener
            return cred.user;
        } catch (err) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    }, []);

    const login = useCallback(async (email, password) => {
        setError(null);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            return cred.user;
        } catch (err) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            const cred = await signInWithPopup(auth, provider);
            return cred.user;
        } catch (err) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    // Refresh user profile
    const refreshUserProfile = useCallback(async () => {
        if (!user) return;
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
    }, [user]);

    // Set invite token to be processed after login/signup
    const setInviteToken = useCallback((token) => {
        setPendingInviteToken(token);
        // Also store in sessionStorage to survive page refreshes
        if (token) {
            sessionStorage.setItem('pendingInviteToken', token);
        } else {
            sessionStorage.removeItem('pendingInviteToken');
        }
    }, []);

    // Update user profile
    const updateUserProfile = useCallback(async (data) => {
        if (!user) return;
        await updateUserProfileInFirestore(user.uid, data);
        await refreshUserProfile();
    }, [user, refreshUserProfile]);

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            error,
            signup,
            login,
            logout,
            signInWithGoogle,
            updateUserProfile,
            refreshUserProfile,
            clearError,
            setInviteToken,
            isAuthenticated: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

async function processPendingInvitations(email, newUserId) {
    try {
        const invitations = await getInvitationsForEmail(email);
        for (const invitation of invitations) {
            // Create bidirectional friend links
            console.log(`Processing invitation from ${invitation.fromUserId} to ${newUserId}`);
            await addFriendLink(invitation.fromUserId, newUserId);
            await addFriendLink(newUserId, invitation.fromUserId);
            // Delete the processed invitation
            await deleteInvitation(invitation.id);
        }
        return invitations.length;
    } catch (err) {
        console.error('Error processing pending invitations:', err);
        return 0;
    }
}

async function processInviteToken(token, currentUserId) {
    try {
        const tokenData = await getInviteToken(token);
        if (!tokenData) {
            console.log('Invite token not found:', token);
            return false;
        }
        if (tokenData.usedBy) {
            console.log('Invite token already used:', token);
            return false;
        }
        if (new Date(tokenData.expiresAt) < new Date()) {
            console.log('Invite token expired:', token);
            return false;
        }
        if (tokenData.userId === currentUserId) {
            console.log('Cannot use your own invite token');
            return false;
        }

        // Create bidirectional friend links
        console.log(`Processing invite from ${tokenData.userId} to ${currentUserId}`);
        try {
            await addFriendLink(tokenData.userId, currentUserId);
            console.log(`Created friend link: ${tokenData.userId} -> ${currentUserId}`);
        } catch (err) {
            console.error(`Failed to create friend link ${tokenData.userId} -> ${currentUserId}:`, err);
            return false;
        }

        try {
            await addFriendLink(currentUserId, tokenData.userId);
            console.log(`Created friend link: ${currentUserId} -> ${tokenData.userId}`);
        } catch (err) {
            console.error(`Failed to create friend link ${currentUserId} -> ${tokenData.userId}:`, err);
            return false;
        }

        // Mark token as used
        try {
            await useInviteToken(token, currentUserId);
            console.log('Invite token marked as used');
        } catch (err) {
            console.error('Failed to mark token as used:', err);
            // Don't return false here - friend links are already created
        }

        console.log('Invite token processed successfully');
        return true;
    } catch (err) {
        console.error('Error processing invite token:', err);
        return false;
    }
}

function getErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential': return 'Invalid email or password.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        case 'auth/popup-closed-by-user': return 'Sign-in was cancelled. Please try again.';
        case 'auth/popup-blocked': return 'Sign-in popup was blocked. Please allow popups for this site.';
        case 'auth/account-exists-with-different-credential': return 'An account already exists with this email using a different sign-in method.';
        case 'auth/cancelled-popup-request': return 'Sign-in was cancelled. Please try again.';
        default: return 'Something went wrong. Please try again.';
    }
}
