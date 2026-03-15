import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    getIdToken,
} from 'firebase/auth';
import { auth } from '../data/firebase';
import { createUserProfile, getUserProfile, seedDataForUser, getInvitationsForEmail, addFriendLink, deleteInvitation } from '../data/firestore';

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

    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            error,
            signup,
            login,
            logout,
            clearError,
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

function getErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential': return 'Invalid email or password.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        default: return 'Something went wrong. Please try again.';
    }
}
