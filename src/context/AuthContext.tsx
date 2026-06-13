import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';
import { fetchUserProfile, createUserProfile, updateUserExamPreference } from '../services/dbService';
import { UserProfile, UserRole } from '../types';
import { seedInitialDatabase } from '../seeder';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pw: string) => Promise<void>;
  signUpEmail: (email: string, pw: string, name: string, role: UserRole, exam: 'JEE' | 'NEET' | 'Both' | string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setExamPreference: (exam: 'JEE' | 'NEET' | 'Both' | string) => Promise<void>;
  isGuest: boolean;
  enableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Auto-seed database once in the background on startup
  useEffect(() => {
    seedInitialDatabase();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setLoading(true);
      if (fUser) {
        setFirebaseUser(fUser);
        setIsGuest(false);
        // Load custom profile
        let profile = await fetchUserProfile(fUser.uid);
        if (!profile) {
          // If no profile, bootstrap user role profile
          await createUserProfile({
            uid: fUser.uid,
            email: fUser.email || '',
            displayName: fUser.displayName || 'Pupil',
            role: 'user',
            examType: 'Both'
          });
          profile = await fetchUserProfile(fUser.uid);
        }
        setUser(profile);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Google Auth Popup failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInEmail = async (email: string, pw: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      console.error('Email sign in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpEmail = async (
    email: string,
    pw: string,
    name: string,
    role: UserRole,
    exam: 'JEE' | 'NEET' | 'Both' | string
  ) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      // Wait to create user profile in DB
      await createUserProfile({
        uid: cred.user.uid,
        email: email,
        displayName: name,
        role: role,
        examType: exam
      });
    } catch (err) {
      console.error('Email registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    setLoading(true);
    setIsGuest(false);
    await signOut(auth);
    setUser(null);
    setLoading(false);
  };

  const setExamPreference = async (exam: 'JEE' | 'NEET' | 'Both' | string) => {
    if (user) {
      await updateUserExamPreference(user.uid, exam);
      setUser(prev => prev ? { ...prev, examType: exam } : null);
    }
  };

  const enableGuestMode = () => {
    setIsGuest(true);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      sendPasswordReset,
      logout,
      setExamPreference,
      isGuest,
      enableGuestMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be nested within AuthProvider');
  }
  return context;
}
