import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../data/firebase';
import { createUserProfile, getUserProfile, seedDataForUser } from '../data/firestore';

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
                setUser(firebaseUser);
                // Fetch or create profile
                let profile = await getUserProfile(firebaseUser.uid);
                if (!profile) {
                    // First login — create profile + seed data
                    const name = firebaseUser.displayName || firebaseUser.email.split('@')[0];
                    await createUserProfile(firebaseUser.uid, {
                        name,
                        email: firebaseUser.email,
                        avatar: null,
                    });
                    await seedDataForUser(firebaseUser.uid, name, firebaseUser.email);
                    profile = await getUserProfile(firebaseUser.uid);
                }
                setUserProfile(profile);
            } else {
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

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            error,
            signup,
            login,
            logout,
            isAuthenticated: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
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
