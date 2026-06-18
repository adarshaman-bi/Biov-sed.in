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
import { fetchUserProfile, createUserProfile, updateUserExamPreference, updateUserPreferences } from '../services/dbService';
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
  updatePreferences: (prefs: Partial<UserProfile>) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local helpers for guest preferences
const getGuestProfile = (): UserProfile => {
  const localExam = localStorage.getItem('biovised_pref_examType') || 'NEET';
  const localYear = localStorage.getItem('biovised_pref_appearingYear') || '2026';
  
  let localSubjects: string[] = [];
  try {
    const rawSub = localStorage.getItem('biovised_pref_preferredSubjects');
    if (rawSub) localSubjects = JSON.parse(rawSub);
  } catch (e) {
    console.warn('Error parsing preferredSubjects', e);
  }

  let localWatched: string[] = [];
  try {
    const rawWatch = localStorage.getItem('biovised_pref_watchedContent');
    if (rawWatch) localWatched = JSON.parse(rawWatch);
  } catch (e) {
    console.warn('Error parsing watchedContent', e);
  }

  let localSaved: string[] = [];
  try {
    const rawSave = localStorage.getItem('biovised_pref_savedContent');
    if (rawSave) localSaved = JSON.parse(rawSave);
  } catch (e) {
    console.warn('Error parsing savedContent', e);
  }

  let localHidden: string[] = [];
  try {
    const rawHide = localStorage.getItem('biovised_pref_hiddenContent');
    if (rawHide) localHidden = JSON.parse(rawHide);
  } catch (e) {
    console.warn('Error parsing hiddenContent', e);
  }

  let localLiked: string[] = [];
  try {
    const rawLike = localStorage.getItem('biovised_pref_likedContent');
    if (rawLike) localLiked = JSON.parse(rawLike);
  } catch (e) {
    console.warn('Error parsing likedContent', e);
  }

  const localCompleted = localStorage.getItem('biovised_pref_onboardingCompleted') === 'true';

  return {
    uid: 'guest',
    email: 'guest@biovised.org',
    displayName: 'Guest Candidate',
    role: 'user',
    examType: localExam,
    appearingYear: localYear,
    preferredSubjects: localSubjects,
    watchedContent: localWatched,
    savedContent: localSaved,
    hiddenContent: localHidden,
    likedContent: localLiked,
    onboardingCompleted: localCompleted,
    loginType: 'guest',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

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
        localStorage.removeItem('biovised_is_guest'); // block guest persistence once real credentials take over
        // Load custom profile
        let profile = await fetchUserProfile(fUser.uid);
        const isAdminEmail = fUser.email === 'adarshaman898@gmail.com';
        if (!profile) {
          // If no profile, bootstrap user role profile
          const now = new Date().toISOString();
          await createUserProfile({
            uid: fUser.uid,
            email: fUser.email || '',
            displayName: fUser.displayName || 'Pupil',
            role: isAdminEmail ? 'admin' : 'user',
            examType: 'NEET',
            createdAt: now,
            updatedAt: now,
          });
          profile = await fetchUserProfile(fUser.uid);
        } else if (isAdminEmail && profile.role !== 'admin') {
          profile.role = 'admin';
        }
        setUser(profile);
      } else {
        setFirebaseUser(null);
        const cachedGuest = localStorage.getItem('biovised_is_guest') === 'true';
        if (cachedGuest) {
          setIsGuest(true);
          setUser(getGuestProfile());
        } else {
          setIsGuest(false);
          setUser(null);
        }
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
        examType: exam,
        appearingYear: '2026',
        preferredSubjects: [],
        watchedContent: [],
        savedContent: [],
        hiddenContent: [],
        likedContent: [],
        onboardingCompleted: false,
        loginType: 'email'
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
    localStorage.removeItem('biovised_is_guest');
    localStorage.removeItem('biovised_pref_onboardingCompleted');
    localStorage.removeItem('biovised_pref_examType');
    localStorage.removeItem('biovised_pref_appearingYear');
    localStorage.removeItem('biovised_pref_preferredSubjects');
    localStorage.removeItem('biovised_pref_watchedContent');
    localStorage.removeItem('biovised_pref_savedContent');
    localStorage.removeItem('biovised_pref_hiddenContent');
    localStorage.removeItem('biovised_pref_likedContent');
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut exception bypassed:', err);
    }
    setUser(null);
    setFirebaseUser(null);
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
    localStorage.setItem('biovised_is_guest', 'true');
    setUser(getGuestProfile());
    setFirebaseUser(null);
  };

  const updatePreferences = async (newPrefs: Partial<UserProfile>) => {
    if (isGuest || !firebaseUser || user?.uid === 'guest') {
      if (newPrefs.examType !== undefined) localStorage.setItem('biovised_pref_examType', newPrefs.examType);
      if (newPrefs.appearingYear !== undefined) localStorage.setItem('biovised_pref_appearingYear', newPrefs.appearingYear);
      if (newPrefs.preferredSubjects !== undefined) localStorage.setItem('biovised_pref_preferredSubjects', JSON.stringify(newPrefs.preferredSubjects));
      if (newPrefs.watchedContent !== undefined) localStorage.setItem('biovised_pref_watchedContent', JSON.stringify(newPrefs.watchedContent));
      if (newPrefs.savedContent !== undefined) localStorage.setItem('biovised_pref_savedContent', JSON.stringify(newPrefs.savedContent));
      if (newPrefs.hiddenContent !== undefined) localStorage.setItem('biovised_pref_hiddenContent', JSON.stringify(newPrefs.hiddenContent));
      if (newPrefs.likedContent !== undefined) localStorage.setItem('biovised_pref_likedContent', JSON.stringify(newPrefs.likedContent));
      if (newPrefs.onboardingCompleted !== undefined) localStorage.setItem('biovised_pref_onboardingCompleted', String(newPrefs.onboardingCompleted));
      
      setUser(getGuestProfile());
    } else if (firebaseUser) {
      const sanitizedPrefs = { ...newPrefs };
      delete sanitizedPrefs.uid;
      delete sanitizedPrefs.email;
      delete sanitizedPrefs.role;
      delete sanitizedPrefs.createdAt;
      
      await updateUserPreferences(firebaseUser.uid, sanitizedPrefs);
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...sanitizedPrefs,
          updatedAt: new Date().toISOString()
        };
      });
    }
  };

  const resetPreferences = async () => {
    const emptyPrefs: Partial<UserProfile> = {
      examType: 'NEET',
      appearingYear: '2026',
      preferredSubjects: [],
      watchedContent: [],
      savedContent: [],
      hiddenContent: [],
      likedContent: [],
      onboardingCompleted: false
    };

    if (isGuest || !firebaseUser || user?.uid === 'guest') {
      localStorage.removeItem('biovised_pref_examType');
      localStorage.removeItem('biovised_pref_appearingYear');
      localStorage.removeItem('biovised_pref_preferredSubjects');
      localStorage.removeItem('biovised_pref_watchedContent');
      localStorage.removeItem('biovised_pref_savedContent');
      localStorage.removeItem('biovised_pref_hiddenContent');
      localStorage.removeItem('biovised_pref_likedContent');
      localStorage.removeItem('biovised_pref_onboardingCompleted');
      localStorage.removeItem('biovised_is_guest');
      setIsGuest(false);
      setUser(null);
    } else if (firebaseUser) {
      await updateUserPreferences(firebaseUser.uid, emptyPrefs);
      setUser(prev => prev ? { ...prev, ...emptyPrefs, updatedAt: new Date().toISOString() } : null);
    }
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
      enableGuestMode,
      updatePreferences,
      resetPreferences
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
