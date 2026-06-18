import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  TeacherProfile,
  InstituteProfile,
  Lecture,
  Playlist,
  Batch,
  Review,
  EntityTrustScoreBreakdown as TrustScoreBreakdown,
  WatchHistoryItem,
  ModerationReport,
  AppNotification,
  UserProfile,
  IngestionLog,
  IngestionControl,
  YouTubeChannel,
  YouTubeVideo,
  YouTubeSyncLog
} from '../types';

// USERS SERVICE
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const path = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(profile: Partial<UserProfile>): Promise<void> {
  if (!profile.uid) return;
  const path = `users/${profile.uid}`;
  try {
    const now = new Date().toISOString();
    const fullProfile = {
      uid: profile.uid,
      email: profile.email || '',
      displayName: profile.displayName || 'Guest User',
      photoURL: profile.photoURL || '',
      role: profile.role || 'user',
      examType: profile.examType || 'Both',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', profile.uid), fullProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserExamPreference(uid: string, examType: 'JEE' | 'NEET' | 'Both' | string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      examType,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPreferences(uid: string, preferences: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...preferences,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// TEACHERS SERVICE
export async function fetchTeachers(filters?: {
  subject?: string;
  examType?: string;
  minTrustScore?: number;
  minRating?: number;
}): Promise<TeacherProfile[]> {
  const path = 'teachers';
  try {
    const q = query(collection(db, 'teachers'), orderBy('trustScore', 'desc'));
    const snap = await getDocs(q);
    let teachers = snap.docs.map(d => d.data() as TeacherProfile);
    
    // Client-side mapping & filtering in case composite index not configured
    if (filters) {
      if (filters.subject && filters.subject !== 'All') {
        teachers = teachers.filter(t => t.subject === filters.subject || t.subjects?.includes(filters.subject));
      }
      if (filters.examType && filters.examType !== 'All') {
        teachers = teachers.filter(t => t.exams?.includes(filters.examType as 'JEE' | 'NEET'));
      }
      if (filters.minTrustScore) {
        teachers = teachers.filter(t => t.trustScore >= filters.minTrustScore!);
      }
      if (filters.minRating) {
        teachers = teachers.filter(t => t.rating >= filters.minRating!);
      }
    }
    return teachers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchTeacherById(id: string): Promise<TeacherProfile | null> {
  if (!id) return null;
  const path = `teachers/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'teachers', id));
    return docSnap.exists() ? (docSnap.data() as TeacherProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// INSTITUTES SERVICE
export async function fetchInstitutes(): Promise<InstituteProfile[]> {
  const path = 'institutes';
  try {
    const q = query(collection(db, 'institutes'), orderBy('trustScore', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as InstituteProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchInstituteById(id: string): Promise<InstituteProfile | null> {
  if (!id) return null;
  const path = `institutes/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'institutes', id));
    return docSnap.exists() ? (docSnap.data() as InstituteProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// LECTURES SERVICE
const STRATEGY_KEYWORDS = [
  'strategy', 'strategies', 'motivation', 'motivational', 
  'how to crack', 'how to clear', 'preparation tips', 'tips & tricks',
  'tips and tricks', 'roadmap', 'last minute', 'study plan', 
  'cut-off', 'cutoff', 'marks vs rank', 'rank predictor', 'secrets of success',
  'jee strategy', 'neet strategy', 'preparation guide', 'timetable', 'time table',
  'leak', 'leaked', 'shocking', 'exposed', 'scam', 'do not miss', 'must watch',
  'guaranteed marks', 'cheat codes', 'cheat code', 'fail', 'crying',
  'emotional', 'sorry', 'insane', 'magic', 'magical', 'giveaway', 'surprise',
  'short', 'shorts', 'reel', 'reels', 'clip', 'clips', 'tiktok'
];

export function isStrategyOrHypeContent(title: string): boolean {
  if (!title) return false;
  const tLower = title.toLowerCase();
  return STRATEGY_KEYWORDS.some(keyword => tLower.includes(keyword));
}

export function isDurationBelow30Minutes(durationStr: string): boolean {
  if (!durationStr) return true;
  const dLower = durationStr.toLowerCase().trim();
  
  if (dLower.startsWith('pt')) {
    let minutes = 0;
    const hourMatch = dLower.match(/(\d+)\s*h/);
    if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = dLower.match(/(\d+)\s*m/);
    if (minMatch) minutes += parseInt(minMatch[1], 10);
    return minutes < 30;
  }

  let totalMinutes = 0;
  const hourMatch = dLower.match(/(\d+)\s*h/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
  const minMatch = dLower.match(/(\d+)\s*m/);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  } else if (!hourMatch) {
    const parts = dLower.split(':');
    if (parts.length === 3) {
      totalMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 2) {
      totalMinutes += parseInt(parts[0], 10);
    } else {
      const numericOnly = parseInt(dLower.replace(/[^\d]/g, ''), 10);
      if (!isNaN(numericOnly)) {
        totalMinutes = numericOnly;
      }
    }
  }
  return totalMinutes < 30;
}

export async function fetchLectures(filters?: {
  subject?: string;
  examType?: string;
  contentType?: 'lecture' | 'oneshot' | 'playlist';
  teacherId?: string;
  instituteId?: string;
  includeUnverified?: boolean;
}): Promise<Lecture[]> {
  const path = 'lectures';
  try {
    const q = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let lectures = snap.docs.map(d => d.data() as Lecture);

    // Apply strict production content quality filters: block shorts, strategy/hype titles, and videos without thumbnails
    lectures = lectures.filter(l => 
      l.thumbnailUrl && 
      l.thumbnailUrl.trim() !== '' && 
      !isDurationBelow30Minutes(l.duration) && 
      !isStrategyOrHypeContent(l.title)
    );

    // Filter by verification unless includeUnverified is set (e.g., in Admin panel)
    if (!filters?.includeUnverified) {
      lectures = lectures.filter(l => l.verified === true || l.verificationStatus === 'verified');
    }

    if (filters) {
      if (filters.subject && filters.subject !== 'All') {
        lectures = lectures.filter(l => l.subject === filters.subject);
      }
      if (filters.examType && filters.examType !== 'All') {
        lectures = lectures.filter(l => l.examType === filters.examType || l.examType === 'Both');
      }
      if (filters.contentType) {
        lectures = lectures.filter(l => 
          l.contentType === filters.contentType ||
          (filters.contentType === 'lecture' && l.contentType === 'playlist')
        );
      }
      if (filters.teacherId) {
        lectures = lectures.filter(l => l.teacherId === filters.teacherId);
      }
      if (filters.instituteId) {
        lectures = lectures.filter(l => l.instituteId === filters.instituteId);
      }
    }
    return lectures;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// PLAYLISTS SERVICE
export async function fetchPlaylists(filters?: {
  subject?: string;
  examType?: string;
  teacherId?: string;
}): Promise<Playlist[]> {
  const path = 'playlists';
  try {
    const q = query(collection(db, 'playlists'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let playlists = snap.docs.map(d => d.data() as Playlist);

    if (filters) {
      if (filters.subject && filters.subject !== 'All') {
        playlists = playlists.filter(p => p.subject === filters.subject);
      }
      if (filters.examType && filters.examType !== 'All') {
        playlists = playlists.filter(p => p.examType === filters.examType || p.examType === 'Both');
      }
      if (filters.teacherId) {
        playlists = playlists.filter(p => p.teacherId === filters.teacherId);
      }
    }
    return playlists;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchPlaylistById(id: string): Promise<Playlist | null> {
  if (!id) return null;
  const path = `playlists/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'playlists', id));
    return docSnap.exists() ? (docSnap.data() as Playlist) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// BATCHES SERVICE
export async function fetchBatches(instituteId?: string): Promise<Batch[]> {
  const path = 'batches';
  try {
    const q = query(collection(db, 'batches'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let batches = snap.docs.map(d => d.data() as Batch);
    if (instituteId) {
      batches = batches.filter(b => b.instituteId === instituteId);
    }
    return batches;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchBatchById(id: string): Promise<Batch | null> {
  if (!id) return null;
  const path = `batches/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'batches', id));
    return docSnap.exists() ? (docSnap.data() as Batch) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Helper to read local reviews safely (Node/client environment proof)
function getLocalReviews(targetId: string): Review[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(`local_reviews_${targetId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("localStorage read failed:", err);
    return [];
  }
}

// Helper to write local reviews safely
function saveLocalReview(targetId: string, review: Review) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getLocalReviews(targetId);
    const updated = [review, ...current.filter(r => r.id !== review.id)];
    localStorage.setItem(`local_reviews_${targetId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn("localStorage write failed:", err);
  }
}

// REVIEWS SERVICE
export async function fetchReviews(targetId: string): Promise<Review[]> {
  if (!targetId) return [];
  let fbReviews: Review[] = [];
  try {
    const q = query(collection(db, 'reviews'), where('targetId', '==', targetId));
    const snap = await getDocs(q);
    fbReviews = snap.docs.map(d => d.data() as Review);
  } catch (error) {
    console.warn("Firestore fetchReviews failed (using local or offline):", error);
  }

  const local = getLocalReviews(targetId);
  const mergedMap = new Map<string, Review>();
  fbReviews.forEach(r => mergedMap.set(r.id, r));
  local.forEach(r => mergedMap.set(r.id, r));

  const reviews = Array.from(mergedMap.values());
  return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function submitReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'userId' | 'userDisplayName'> & { lectureId?: string }): Promise<void> {
  const user = auth.currentUser;
  const userId = user ? user.uid : 'guest_student';
  const displayName = user ? (user.displayName || 'Verified Pupil') : 'Guest Student';
  
  const reviewId = user 
    ? `${user.uid}_${reviewData.targetId}_${reviewData.lectureId || 'general'}_${Date.now()}`
    : `guest_${Date.now()}_${reviewData.targetId}`;
    
  const path = `reviews/${reviewId}`;
  try {
    const now = new Date().toISOString();
    const newReview: Review = {
      ...reviewData,
      id: reviewId,
      userId: userId,
      userDisplayName: displayName,
      createdAt: now,
      
      // Phase 4 compliance:
      lectureRef: reviewData.lectureId ? `/lectures/${reviewData.lectureId}` : `/lectures/general`,
      teacherRef: reviewData.targetType === 'teacher' ? `/teachers/${reviewData.targetId}` : null,
      source: 'platform',
      sourceCommentId: null,
      userIdOrHandle: displayName,
      text: reviewData.comment,
      flagged: false
    } as any;

    // Save locally first so it is instant
    saveLocalReview(reviewData.targetId, newReview);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('reviewAdded'));
    }

    // Sync to Firestore if authenticated
    if (user) {
      await setDoc(doc(db, 'reviews', reviewId), newReview);
    }
  } catch (error) {
    console.warn("Firestore reviews sync skipped:", error);
  }
}

export async function unflagReview(reviewId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const path = `reviews/${reviewId}`;
  try {
    await updateDoc(doc(db, 'reviews', reviewId), {
      flagged: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchFlaggedReviews(): Promise<Review[]> {
  const path = 'reviews';
  try {
    const q = query(collection(db, 'reviews'), where('flagged', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Review);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// TRUST SCORE DETAILS
export async function fetchTrustScore(entityId: string): Promise<TrustScoreBreakdown | null> {
  if (!entityId) return null;
  const path = `trustScores/${entityId}`;
  try {
    const docSnap = await getDoc(doc(db, 'trustScores', entityId));
    if (docSnap.exists()) {
      return docSnap.data() as TrustScoreBreakdown;
    }
    // Generate clean unrated zero-state breakdown if none exists
    return {
      entityId,
      profileCompleteness: 0,
      verifiedCredentials: 0,
      officialLinksScore: 0,
      reviewReliability: 0,
      contentConsistency: 0,
      communityEngagement: 0,
      totalScore: 0,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function recalibrateTrustScore(entityId: string, entityType: 'teacher' | 'institute'): Promise<TrustScoreBreakdown> {
  const now = new Date().toISOString();
  
  // 1. Fetch educator profile
  let isVerified = false;
  let bioText = '';
  let subjectsList: string[] = [];
  let socialLinksExist = false;
  let overallRating = 0;
  
  if (entityType === 'teacher') {
    const docSnap = await getDoc(doc(db, 'teachers', entityId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      isVerified = !!data.isVerified || !!data.verified;
      bioText = data.bio || '';
      subjectsList = data.subjects || (data.subject ? [data.subject] : []);
      socialLinksExist = (data.socialProfiles && data.socialProfiles.length > 0) || 
                         (data.officialLinks && data.officialLinks.length > 0) || 
                         !!data.officialWebsite;
    }
  } else {
    const docSnap = await getDoc(doc(db, 'institutes', entityId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      isVerified = !!data.isVerified;
      bioText = data.description || '';
      subjectsList = data.exams || [];
      socialLinksExist = (data.officialLinks && data.officialLinks.length > 0);
    }
  }
  
  // 2. Official Instructor Link verified (2% max)
  const officialLinksScore = isVerified ? 2 : 0;
  
  // 3. Profile Completeness (3% max)
  let profileCompleteness = 0;
  if (bioText.trim().length > 15) profileCompleteness += 1;
  if (subjectsList.length > 0) profileCompleteness += 1;
  if (socialLinksExist) profileCompleteness += 1;
  
  // 4. Verified Student Reviews (40% max)
  let reviewReliability = 0;
  const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('targetId', '==', entityId)));
  const reviews = reviewsSnap.docs.map(d => d.data() as Review);
  const verifiedStudentReviews = reviews.filter(r => r.isVerifiedStudent === true);
  
  if (verifiedStudentReviews.length > 0) {
    const avgRating = verifiedStudentReviews.reduce((sum, r) => sum + r.rating, 0) / verifiedStudentReviews.length;
    overallRating = avgRating;
    reviewReliability = Math.round((avgRating / 5.0) * 40);
  } else if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    overallRating = avgRating;
    reviewReliability = Math.round((avgRating / 5.0) * 32); // Slight weight penalty for lack of verified student status
  } else {
    overallRating = 0;
    reviewReliability = 0; // No real reviews => zero score contribution
  }
  
  // 5. Content Consistency (1% max)
  let contentConsistency = 1;
  const lecturesSnap = await getDocs(query(collection(db, 'lectures'), where(entityType === 'teacher' ? 'teacherId' : 'instituteId', '==', entityId)));
  const lectures = lecturesSnap.docs.map(d => d.data() as Lecture);
  
  if (lectures.length > 0) {
    if (entityType === 'teacher') {
      const matchingCount = lectures.filter(l => 
        l.subject && subjectsList.map((s: string) => s.toLowerCase()).includes(l.subject.toLowerCase())
      ).length;
      contentConsistency = parseFloat((matchingCount / lectures.length).toFixed(2)) * 1.0;
    } else {
      const matchingCount = lectures.filter(l => 
        l.examType && subjectsList.map((s: string) => s.toLowerCase()).includes(l.examType.toLowerCase())
      ).length;
      contentConsistency = parseFloat((matchingCount / lectures.length).toFixed(2)) * 1.0;
    }
  }
  
  // 6. Community Engagement (40% max)
  let communityEngagement = 32.0; // Default dynamic fallback
  if (lectures.length > 0) {
    const totalViews = lectures.reduce((sum, l) => sum + (l.viewsCount || 0), 0);
    const totalLikes = lectures.reduce((sum, l) => sum + (l.likesCount || 0), 0);
    const avgViews = totalViews / lectures.length;
    
    // Engagement Like ratios (median standard ~5-8%)
    const channelLikeRatio = totalLikes / (totalViews || 1);
    const likeRatioScore = Math.min(20, (channelLikeRatio / 0.08) * 20);
    
    // Views deviation performance compared to self
    const highPerformingCount = lectures.filter(l => (l.viewsCount || 0) >= avgViews * 0.8).length;
    const consistencyRate = highPerformingCount / lectures.length;
    const consistencyScore = consistencyRate * 20;
    
    communityEngagement = parseFloat((likeRatioScore + consistencyScore).toFixed(1));
  }
  
  // 7. Student Completion/Learning Retention (14% max)
  let verifiedCredentials = 11.0; // Standard complete-rate default index
  // Fetch watch completion rate indices
  try {
    const user = auth.currentUser;
    if (user) {
      const historySnap = await getDocs(collection(db, 'users', user.uid, 'watchHistory'));
      const historyItems = historySnap.docs.map(d => d.data());
      const relevantHistory = historyItems.filter(item => 
        lectures.some(l => l.id === item.lectureId)
      );
      if (relevantHistory.length > 0) {
        const completedCount = relevantHistory.filter(h => h.completed).length;
        verifiedCredentials = parseFloat(((completedCount / relevantHistory.length) * 14).toFixed(1));
      }
    }
  } catch (err) {
    console.warn("Watch history scan restricted, applying default baseline completion score.", err);
  }
  
  const totalScore = Math.min(100, Math.round(
    officialLinksScore + profileCompleteness + reviewReliability + contentConsistency + communityEngagement + verifiedCredentials
  ));
  
  const breakdown: TrustScoreBreakdown = {
    entityId,
    profileCompleteness,
    verifiedCredentials,
    officialLinksScore,
    reviewReliability,
    contentConsistency,
    communityEngagement,
    totalScore,
    updatedAt: now
  };
  
  // Set in Firestore
  await setDoc(doc(db, 'trustScores', entityId), breakdown);
  
  // Update parent entity trustScore attribute
  await updateDoc(doc(db, entityType === 'teacher' ? 'teachers' : 'institutes', entityId), {
    trustScore: totalScore
  });
  
  return breakdown;
}

// BOOKMARKS & PRIVATE STUDENT ASSETS
export async function toggleFollow(entityId: string, entityName: string, entityAvatar: string, isFollowing: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user || !entityId) return;

  const path = `users/${user.uid}/following/${entityId}`;
  try {
    const followDocRef = doc(db, 'users', user.uid, 'following', entityId);
    if (isFollowing) {
      await deleteDoc(followDocRef);
    } else {
      await setDoc(followDocRef, {
        id: entityId,
        name: entityName,
        avatar: entityAvatar,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchFollowingList(): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/following`;
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'following'));
    return snap.docs.map(doc => doc.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function toggleWatchLater(lecture: Lecture, isBookmarked: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user || !lecture || !lecture.id) return;

  const path = `users/${user.uid}/watchLater/${lecture.id}`;
  try {
    const ref = doc(db, 'users', user.uid, 'watchLater', lecture.id);
    if (isBookmarked) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...lecture,
        savedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchWatchLaterIds(): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/watchLater`;
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'watchLater'));
    return snap.docs.map(doc => doc.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function fetchWatchLaterLectures(): Promise<Lecture[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/watchLater`;
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'watchLater'));
    return snap.docs.map(doc => doc.data() as Lecture);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function toggleLikeVideo(lecture: Lecture, isLiked: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user || !lecture || !lecture.id) return;

  const path = `users/${user.uid}/likedVideos/${lecture.id}`;
  try {
    const ref = doc(db, 'users', user.uid, 'likedVideos', lecture.id);
    if (isLiked) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...lecture,
        likedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchLikedLecturesIds(): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/likedVideos`;
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'likedVideos'));
    return snap.docs.map(doc => doc.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// WATCH HISTORY LOGGER
export async function trackWatchProgress(lecture: Lecture, progressSeconds: number, completed: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user || !lecture || !lecture.id) return;

  const path = `users/${user.uid}/watchHistory/${lecture.id}`;
  try {
    const ref = doc(db, 'users', user.uid, 'watchHistory', lecture.id);
    const historyItem: WatchHistoryItem = {
      id: `${user.uid}_${lecture.id}`,
      userId: user.uid,
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      thumbnailUrl: lecture.thumbnailUrl,
      progressSeconds,
      durationString: lecture.duration,
      completed,
      updatedAt: new Date().toISOString()
    };
    await setDoc(ref, historyItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchWatchHistory(): Promise<WatchHistoryItem[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/watchHistory`;
  try {
    const q = query(collection(db, 'users', user.uid, 'watchHistory'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as WatchHistoryItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// REPORTS (MODERATION QUEUE)
export async function submitReport(reportData: Omit<ModerationReport, 'id' | 'reporterId' | 'reporterName' | 'status' | 'createdAt'>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Required to sign in to submit report.');

  const reportId = `${user.uid}_${Date.now()}`;
  const path = `reports/${reportId}`;
  try {
    const newReport: ModerationReport = {
      ...reportData,
      id: reportId,
      reporterId: user.uid,
      reporterName: user.displayName || 'JEE/NEET Candidate',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'reports', reportId), newReport);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchModerationReports(): Promise<ModerationReport[]> {
  const path = 'reports';
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as ModerationReport);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function resolveModerationReport(reportId: string, action: 'resolved' | 'dismissed', commentary: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: action,
      resolution: commentary,
      resolvedBy: user.displayName || user.email || 'Staff',
      resolvedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// NOTIFICATIONS
export async function fetchNotifications(): Promise<AppNotification[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}/notifications`;
  try {
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as AppNotification);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addRealNotification(
  title: string,
  message: string,
  type: 'system' | 'follow' | 'video' | 'review'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/notifications`;
  try {
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const newDocRef = doc(notificationsRef);
    await setDoc(newDocRef, {
      id: newDocRef.id,
      userId: user.uid,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// YOUTUBE SKELETAL INGESTION AGENTS
export async function saveImportedPlaylist(playlist: Playlist): Promise<void> {
  const path = `playlists/${playlist.id}`;
  try {
    await setDoc(doc(db, 'playlists', playlist.id), playlist);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function saveImportedLectures(lectures: Lecture[]): Promise<void> {
  const path = 'lectures-batch';
  try {
    const batch = writeBatch(db);
    lectures.forEach((lecture) => {
      batch.set(doc(db, 'lectures', lecture.id), lecture);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateTeacherVerification(teacherId: string, updates: Partial<TeacherProfile>): Promise<void> {
  const path = `teachers/${teacherId}`;
  try {
    await updateDoc(doc(db, 'teachers', teacherId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateInstituteVerification(instId: string, updates: Partial<InstituteProfile>): Promise<void> {
  const path = `institutes/${instId}`;
  try {
    await updateDoc(doc(db, 'institutes', instId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// INGESTION SERVICES
export async function createIngestionLog(log: Omit<IngestionLog, 'id'>): Promise<string> {
  const logRef = doc(collection(db, 'ingestionLogs'));
  const path = `ingestionLogs/${logRef.id}`;
  const finalLog: IngestionLog = { ...log, id: logRef.id };
  try {
    await setDoc(logRef, finalLog);
    return logRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateIngestionLog(id: string, updates: Partial<Omit<IngestionLog, 'id'>>): Promise<void> {
  const path = `ingestionLogs/${id}`;
  try {
    await updateDoc(doc(db, 'ingestionLogs', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function fetchAllIngestionLogs(): Promise<IngestionLog[]> {
  const path = 'ingestionLogs';
  try {
    const q = query(collection(db, 'ingestionLogs'), orderBy('startedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as IngestionLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveIngestionControl(control: IngestionControl): Promise<void> {
  const path = `ingestionControl/${control.id}`;
  try {
    await setDoc(doc(db, 'ingestionControl', control.id), control);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchIngestionControl(id: string = 'phase1_state'): Promise<IngestionControl | null> {
  const path = `ingestionControl/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'ingestionControl', id));
    if (docSnap.exists()) {
      return docSnap.data() as IngestionControl;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateLectureVerification(
  lectureId: string, 
  verified: boolean, 
  status: 'verified' | 'pending' | 'rejected'
): Promise<void> {
  const path = `lectures/${lectureId}`;
  try {
    await updateDoc(doc(db, 'lectures', lectureId), {
      verified,
      verificationStatus: status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// NEW YOUTUBE IMPORTER CLIENT SERVICES

export async function fetchAllChannels(): Promise<YouTubeChannel[]> {
  const path = 'channels';
  try {
    const snap = await getDocs(query(collection(db, 'channels'), orderBy('addedAt', 'desc')));
    return snap.docs.map(doc => doc.data() as YouTubeChannel);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveChannel(channel: YouTubeChannel): Promise<void> {
  const path = `channels/${channel.id}`;
  try {
    await setDoc(doc(db, 'channels', channel.id), channel);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  const path = `channels/${channelId}`;
  try {
    await deleteDoc(doc(db, 'channels', channelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function fetchPlaylistsForAdmin(filters?: { channelId?: string; importStatus?: string }): Promise<Playlist[]> {
  const path = 'playlists';
  try {
    let q = query(collection(db, 'playlists'), orderBy('createdAt', 'desc'));
    if (filters?.channelId) {
      q = query(collection(db, 'playlists'), where('channelId', '==', filters.channelId));
    }
    const snap = await getDocs(q);
    let playlists = snap.docs.map(doc => doc.data() as Playlist);
    if (filters?.importStatus) {
      playlists = playlists.filter(p => p.importStatus === filters.importStatus);
    }
    return playlists;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function savePlaylistAdmin(playlist: Playlist): Promise<void> {
  const path = `playlists/${playlist.id}`;
  try {
    await setDoc(doc(db, 'playlists', playlist.id), playlist);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchAllVideos(filters?: { playlistId?: string; subject?: string }): Promise<YouTubeVideo[]> {
  const path = 'videos';
  try {
    let q = query(collection(db, 'videos'), orderBy('importedAt', 'desc'));
    if (filters?.playlistId) {
      q = query(collection(db, 'videos'), where('playlistId', '==', filters.playlistId));
    }
    const snap = await getDocs(q);
    let videos = snap.docs.map(doc => doc.data() as YouTubeVideo);
    if (filters?.subject) {
      videos = videos.filter(v => v.subject.toLowerCase() === filters.subject!.toLowerCase());
    }
    return videos;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveVideo(video: YouTubeVideo): Promise<void> {
  const path = `videos/${video.id}`;
  try {
    await setDoc(doc(db, 'videos', video.id), video);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function saveVideosBatch(videos: YouTubeVideo[]): Promise<void> {
  const path = 'videos-batch';
  try {
    const batch = writeBatch(db);
    videos.forEach((video) => {
      batch.set(doc(db, 'videos', video.id), video);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchAllYouTubeSyncLogs(): Promise<YouTubeSyncLog[]> {
  const path = 'syncLogs';
  try {
    const q = query(collection(db, 'syncLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as YouTubeSyncLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function saveYouTubeSyncLog(log: YouTubeSyncLog): Promise<void> {
  const path = `syncLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'syncLogs', log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}



