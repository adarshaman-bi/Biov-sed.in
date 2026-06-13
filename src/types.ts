export type UserRole = 'user' | 'teacher' | 'institute' | 'moderator' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  examType: 'JEE' | 'NEET' | 'Both' | string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  avatar: string;
  subject: string; // Primary subject: "Physics", "Chemistry", "Mathematics", "Biology", "Polity", "Law", "Finance", "English", etc.
  instituteId?: string;
  instituteName?: string;
  bio: string;
  rating: number;
  reviewCount: number;
  trustScore: number | null;
  followersCount: number;
  officialLinks: string[];
  subjects: string[];
  exams: string[];
  isVerified: boolean;
  verified?: boolean;
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  verificationMethod?: string[];
  kgEntityId?: string;
  verificationProvenance?: string;
  youtubeChannelId?: string;
  officialWebsite?: string | null;
  socialProfiles?: string[];
  verificationSourceIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface InstituteProfile {
  id: string;
  name: string;
  logo: string;
  description: string;
  rating: number;
  reviewCount: number;
  trustScore: number;
  followersCount: number;
  officialLinks: string[];
  exams: string[];
  isVerified: boolean;
  verified?: boolean;
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  verificationMethod?: string[];
  kgEntityId?: string;
  verificationProvenance?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Lecture {
  id: string;
  title: string;
  description: string;
  videoUrl: string; // YouTube or other embed URL
  thumbnailUrl: string;
  subject: string;
  examType: 'JEE' | 'NEET' | 'Both' | string;
  contentType: 'playlist' | 'oneshot' | 'lecture';
  teacherId: string;
  teacherName: string;
  instituteId?: string;
  instituteName?: string;
  playlistId?: string;
  duration: string;
  viewsCount: number;
  likesCount: number;
  publishDate?: string;
  createdAt: string;

  // 1.5 data model support
  youtubeVideoId?: string;
  examType_db?: 'JEE' | 'NEET' | null; // internal mapping helper for strict "JEE|NEET|null" if needed
  chapter?: string | null;
  durationSec?: number;
  language?: string | null;
  teacherRef?: string | null;
  sourceUrl?: string;
  verified?: boolean;
  lastUpdated?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  teacherId: string;
  teacherName: string;
  instituteId?: string;
  instituteName?: string;
  subject: string;
  examType: 'JEE' | 'NEET' | 'Both' | string;
  lecturesCount: number;
  createdAt: string;

  // 1.5 data model support
  youtubePlaylistId?: string;
  channelId?: string;
  examTypes?: string[];
  subject_db?: string | null;
  teacherRef?: string | null;
  sourceUrl?: string;
  verified?: boolean;
  updatedAt?: string;
}

export interface IngestionLog {
  id: string;
  taskType: 'FetchPlaylists' | 'FetchPlaylistVideos' | 'VerifyTeacher';
  targetId: string;
  status: 'pending' | 'completed' | 'failed';
  attempts: number;
  startedAt: string;
  endedAt: string | null;
  error: string | null;
}

export interface IngestionControl {
  id: string;
  phase: number;
  playlistsImported: number;
  lecturesImported: number;
  approved: boolean;
  nextPhaseStart: string | null;
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  instituteId: string;
  instituteName: string;
  teachers: string[]; // Teacher Names or IDs
  subject: string; // "Physics", "Full Course", etc.
  examType: 'JEE' | 'NEET' | 'Both' | string;
  startDate: string;
  endDate: string;
  price?: number;
  discountCode?: string;
  couponCode?: string;
  link?: string;
  verified?: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userDisplayName: string;
  targetId: string; // Teacher ID or Institute ID
  targetType: 'teacher' | 'institute';
  rating: number;
  comment: string;
  trustImpact: number;
  isVerifiedStudent: boolean;
  createdAt: string;
  // Phase 4 additions:
  lectureRef?: string;
  teacherRef?: string | null;
  source?: 'youtube' | 'platform';
  sourceCommentId?: string | null;
  userIdOrHandle?: string;
  text?: string;
  flagged?: boolean;
}

export interface TrustScoreBreakdown {
  entityId: string;
  profileCompleteness: number; // 0-3 (3% max)
  verifiedCredentials: number; // 0-14 (Student Completion 14% max)
  officialLinksScore: number;  // 0-2 (Official Instructor Link 2% max)
  reviewReliability: number;   // 0-40 (Verified Student Reviews 40% max)
  contentConsistency: number;  // 0-1 (Content Consistency 1% max)
  communityEngagement: number; // 0-40 (Community Engagement 40% max)
  totalScore: number;          // Cumulative 0-100
  updatedAt: string;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  lectureId: string;
  lectureTitle: string;
  thumbnailUrl: string;
  progressSeconds: number;
  durationString: string;
  completed: boolean;
  updatedAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string; // ID of the offensive post, user, review, etc.
  targetType: 'teacher' | 'institute' | 'review' | 'lecture';
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'system' | 'follow' | 'video' | 'review';
  senderId?: string;
  senderName?: string;
  read: boolean;
  createdAt: string;
}
