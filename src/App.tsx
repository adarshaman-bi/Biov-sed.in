import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SearchProvider, useSearch } from './context/SearchContext';
import Header from './components/Header';
import LectureCard from './components/LectureCard';
import TestSeriesDirectory from './components/TestSeriesDirectory';
import { TEST_SERIES_CATALOG } from './data/testSeriesData';
import HomeDashboard from './components/HomeDashboard';
import VideoPlayer from './components/VideoPlayer';
import DetailsModal from './components/DetailsModal';
import { DynamicRating } from './components/DynamicRating';
import ProfileDashboard from './components/ProfileDashboard';
import ModeratorDashboard from './components/ModeratorDashboard';
import AuthModal from './components/AuthModal';
import OnboardingGateway from './components/OnboardingGateway';
import NotificationsDashboard from './components/NotificationsDashboard';
import SearchSpecsModal from './components/SearchSpecsModal';
import {
  personalizeLectures,
  personalizePlaylists,
  personalizeTeachers
} from './services/recommendationEngine';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  fetchTeachers,
  fetchInstitutes,
  fetchLectures,
  fetchPlaylists,
  fetchBatches,
  toggleFollow,
  fetchFollowingList,
  addRealNotification,
  deleteNotification,
  markNotificationAsRead,
  isStrategyOrHypeContent,
  isDurationBelow30Minutes
} from './services/dbService';
import { TeacherProfile, InstituteProfile, Lecture, Playlist, Batch, AppNotification, YouTubeVideo } from './types';
import YoutubeThumbnailImg from './components/YoutubeThumbnailImg';
import VideoLibrary from './components/VideoLibrary';
import {
  Star,
  Award,
  BookOpen,
  Filter,
  CheckCircle,
  Play,
  User,
  Activity,
  Heart,
  ExternalLink,
  ChevronRight,
  Home,
  Search,
  Library,
  PlaySquare,
  GraduationCap,
  Sparkles,
  Globe,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Layers,
  Video,
  Building2,
  ArrowLeft,
  X,
  SlidersHorizontal,
  EyeOff,
  Clock,
  Mic
} from 'lucide-react';
import { getPlaylistThumbnail, getLectureThumbnail } from './services/thumbnailHelper';
import { BatchCard } from './components/BatchCard';
import { InstituteCard } from './components/InstituteCard';

function LectureCardSkeleton() {
  return (
    <div className="bg-[#0E0E10] border border-zinc-900/90 rounded-2xl overflow-hidden flex flex-col justify-between h-full animate-pulse select-none">
      <div className="relative aspect-video bg-zinc-900/40" />
      <div className="p-4 space-y-3.5 flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-zinc-900/70 rounded w-5/6" />
          <div className="h-3 bg-zinc-900/70 rounded w-2/3" />
          <span className="flex items-center gap-2 pt-2">
            <span className="w-5 h-5 bg-zinc-900/70 rounded-full shrink-0" />
            <span className="h-2.5 bg-zinc-900/70 rounded w-2/5" />
          </span>
        </div>
        <span className="h-2.5 bg-zinc-900/40 rounded w-1/4 pt-1" />
      </div>
    </div>
  );
}

function TeacherCardSkeleton() {
  return (
    <div className="bg-[#111111] rounded-2xl p-6 flex flex-col justify-between gap-4 border border-zinc-900 animate-pulse select-none">
      <div className="space-y-3.5">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-full bg-zinc-900/70" />
          <div className="w-14 h-4 bg-zinc-900/70 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-900/70 rounded w-2/3" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-1/3" />
        </div>
        <div className="h-10 bg-zinc-900/40 rounded w-full" />
      </div>
      <div className="pt-3.5 border-t border-[#262626] flex gap-2">
        <div className="h-7 bg-zinc-900/60 rounded-full flex-1" />
        <div className="h-7 bg-zinc-900/60 rounded-full w-14" />
      </div>
    </div>
  );
}

function BatchCardSkeleton() {
  return (
    <div className="bg-[#111111] rounded-2xl p-5 border border-zinc-900/80 animate-pulse space-y-4 select-none">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-grow">
          <div className="h-3.5 bg-zinc-900/70 rounded w-3/4" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-1/2" />
        </div>
        <div className="w-12 h-5 bg-zinc-900/70 rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-2 bg-zinc-900/50 rounded w-full" />
        <div className="h-2 bg-zinc-900/50 rounded w-5/6" />
      </div>
      <div className="pt-4 border-t border-zinc-900/75 flex justify-between">
        <div className="h-3 bg-zinc-900/60 rounded w-1/4" />
        <div className="h-3 bg-zinc-900/40 rounded w-1/4" />
      </div>
    </div>
  );
}

function InstituteCardSkeleton() {
  return (
    <div className="bg-[#111111] border border-zinc-900 rounded-2xl p-5 animate-pulse flex flex-col justify-between h-full gap-4 select-none">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-zinc-900/70 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0 pt-1">
          <div className="h-3.5 bg-zinc-900/70 rounded w-3/4" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-1/3" />
        </div>
      </div>
      <div className="h-10 bg-zinc-900/40 rounded w-full" />
    </div>
  );
}

function AppContent() {
  const { user, isGuest, enableGuestMode, loading, setExamPreference, updatePreferences } = useAuth();

  // Control splash screen layers (shows on initial session load)
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('biovised_splash_shown');
    } catch {
      return true;
    }
  });

  // Control initial loading state to prevent flash layout shifts
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Control core view layers
  const [currentView, setCurrentView] = useState<'explore' | 'profile' | 'moderator' | 'notifications' | 'search'>('explore');
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [activeExploreTab, setActiveExploreTab] = useState<'home' | 'teachers' | 'playlists' | 'tests' | 'batches' | 'lecture' | 'institutes'>('home');
  
  // Search history state for previous 15 days
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; ts: number }>>([]);

  // Modals managers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ id: string; type: 'teacher' | 'institute' } | null>(null);
  const [specsModalOpen, setSpecsModalOpen] = useState(false);

  // Database loaded sets initialized to safe empty arrays to prevent hydration mismatches
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [institutes, setInstitutes] = useState<InstituteProfile[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Safely restore cached datasets on initial client-only mount
  useEffect(() => {
    try {
      const cachedTeachers = localStorage.getItem('biovised_cached_teachers');
      if (cachedTeachers) setTeachers(JSON.parse(cachedTeachers));

      const cachedInstitutes = localStorage.getItem('biovised_cached_institutes');
      if (cachedInstitutes) setInstitutes(JSON.parse(cachedInstitutes));

      const cachedLectures = localStorage.getItem('biovised_cached_lectures');
      if (cachedLectures) setLectures(JSON.parse(cachedLectures));

      const cachedPlaylists = localStorage.getItem('biovised_cached_playlists');
      if (cachedPlaylists) setPlaylists(JSON.parse(cachedPlaylists));

      const cachedBatches = localStorage.getItem('biovised_cached_batches');
      if (cachedBatches) setBatches(JSON.parse(cachedBatches));

      const cachedExam = localStorage.getItem('biovised_onboarding_exam');
      if (cachedExam) {
        setExamFilter(cachedExam);
        setTestExamTag(cachedExam);
      }
    } catch (e) {
      console.warn("Error restoring local cached datasets:", e);
    }
  }, []);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);

  // Real-time notifications state & syncing hook
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user || user.uid === 'guest') {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AppNotification);
      setNotifications(data);
    }, (error) => {
      console.warn('Real-time notifications exception bypassed:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/notifications`);
      } catch (err) {
        // log silent
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Handle slide-off gesture dismiss
  const handleNotificationDismiss = async (notificationId: string) => {
    // Dynamic local state filter updates the UI instantly as the item exits the screen
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    await deleteNotification(notificationId);
  };

  // Mark all notifications as read inside the dashboard
  const handleMarkAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
  };

  const isHandlingPopState = useRef(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isHandlingPopState.current = true;
      const state = event.state;
      if (state && typeof state === 'object' && 'currentView' in state) {
        setCurrentView(state.currentView);
        setActiveExploreTab(state.activeExploreTab);
        setActiveLecture(state.activeLecture);
        setDetailModal(state.detailModal);
      } else {
        setCurrentView('explore');
        setActiveExploreTab('home');
        setActiveLecture(null);
        setDetailModal(null);
      }
      setTimeout(() => {
        isHandlingPopState.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state || !('currentView' in window.history.state)) {
      window.history.replaceState({
        currentView,
        activeExploreTab,
        activeLecture,
        detailModal
      }, '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (isHandlingPopState.current) return;

    const hState = window.history.state;
    const changed = !hState ||
      hState.currentView !== currentView ||
      hState.activeExploreTab !== activeExploreTab ||
      JSON.stringify(hState.activeLecture) !== JSON.stringify(activeLecture) ||
      JSON.stringify(hState.detailModal) !== JSON.stringify(detailModal);

    if (changed) {
      window.history.pushState({
        currentView,
        activeExploreTab,
        activeLecture,
        detailModal
      }, '');
    }
  }, [currentView, activeExploreTab, activeLecture, detailModal]);

  const handleBackNavigation = () => {
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else {
      setActiveLecture(null);
      setDetailModal(null);
      setCurrentView('explore');
    }
  };

  // Resolve tap interaction of a notification element to route perfectly to content
  const handleNotificationClick = async (n: AppNotification) => {
    // Mark read in real-time
    if (!n.read) {
      await markNotificationAsRead(n.id);
    }

    const text = `${n.title} ${n.message}`.toLowerCase();

    // 1. Check for educators/teachers matching name
    const matchedTeacher = teachers.find(t => 
      text.includes(t.name.toLowerCase()) || 
      (n.senderName && t.name.toLowerCase() === n.senderName.toLowerCase()) ||
      t.id === n.senderId
    );
    if (matchedTeacher) {
      setCurrentView('explore');
      setActiveExploreTab('teachers');
      setDetailModal({ id: matchedTeacher.id, type: 'teacher' });
      return;
    }

    // 2. Check for institutes matching names
    const matchedInstitute = institutes.find(inst => 
      text.includes(inst.name.toLowerCase())
    );
    if (matchedInstitute) {
      setCurrentView('explore');
      setActiveExploreTab('institutes');
      setDetailModal({ id: matchedInstitute.id, type: 'institute' });
      return;
    }

    // 3. Check for specific curation lecture
    const matchedLecture = lectures.find(l => 
      text.includes(l.title.toLowerCase())
    );
    if (matchedLecture) {
      setCurrentView('explore');
      setActiveLecture(matchedLecture);
      return;
    }

    // 4. Check for playlists
    const matchedPlaylist = playlists.find(p => 
      text.includes(p.title.toLowerCase())
    );
    if (matchedPlaylist) {
      setCurrentView('explore');
      handleSelectPlaylist(matchedPlaylist);
      return;
    }

    // Structural Fallback routing based on notification type and keywords
    if (n.type === 'video' || text.includes('lecture') || text.includes('video') || text.includes('lesson')) {
      setCurrentView('explore');
      setActiveExploreTab('lecture');
    } else if (text.includes('test') || text.includes('exam')) {
      setCurrentView('explore');
      setActiveExploreTab('tests');
    } else if (text.includes('batch') || text.includes('cohort')) {
      setCurrentView('explore');
      setActiveExploreTab('batches');
    } else if (n.type === 'follow' || text.includes('educator') || text.includes('follow')) {
      setCurrentView('explore');
      setActiveExploreTab('teachers');
    } else if (n.type === 'review' || text.includes('trust score') || text.includes('rating') || text.includes('review')) {
      setCurrentView('profile');
    } else {
      setCurrentView('explore');
      setActiveExploreTab('home');
    }
  };

  const handleSelectPlaylist = async (p: Playlist) => {
    setIsLoadingLectures(true);
    try {
      const playlistId = p.youtubePlaylistId || p.id;
      const response = await fetch(`/api/youtube/lectures?playlistId=${playlistId}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.status === 'ok' && Array.isArray(resData.data) && resData.data.length > 0) {
          const fetchedLectures = resData.data.map((l: any) => ({
            ...l,
            playlistId: p.id
          }));

          const updatedLectures = [...lectures];
          fetchedLectures.forEach((fl: Lecture) => {
            if (!updatedLectures.some(ul => ul.id === fl.id)) {
              updatedLectures.push(fl);
            }
          });
          setLectures(updatedLectures);
          try {
            localStorage.setItem('biovised_cached_lectures', JSON.stringify(updatedLectures));
          } catch (e) {
            console.warn(e);
          }

          setActiveLecture(fetchedLectures[0]);
          setCurrentView('explore');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    } catch (error) {
      console.error("Failed dynamically fetching playlist videos:", error);
    } finally {
      setIsLoadingLectures(false);
    }

    // Fallback: pseudo-lecture player if the endpoint was empty or failed
    const pseudo: Lecture = {
      id: p.id,
      playlistId: p.id,
      title: p.title,
      description: p.description,
      videoUrl: p.youtubePlaylistId 
        ? `https://www.youtube.com/embed/videoseries?list=${p.youtubePlaylistId}`
        : `https://www.youtube.com/embed/videoseries?list=${p.id}`,
      thumbnailUrl: getPlaylistThumbnail(p),
      subject: p.subject,
      examType: p.examType,
      contentType: 'playlist',
      teacherId: p.teacherId,
      teacherName: p.teacherName,
      instituteId: p.instituteId,
      instituteName: p.instituteName,
      duration: `${p.lecturesCount || 0} Lectures`,
      viewsCount: 1540,
      likesCount: 120,
      createdAt: p.createdAt
    };
    setActiveLecture(pseudo);
    setCurrentView('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic search / filters state from Global Context-Aware Search Architecture
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useSearch();

  // Sync active category inside the context whenever page view or class category tab changes
  useEffect(() => {
    const activeSegment = currentView === 'explore' ? activeExploreTab : currentView;
    setActiveCategory(activeSegment);
  }, [currentView, activeExploreTab, setActiveCategory]);

  // Dedicated Test section filters state
  const [testExamTag, setTestExamTag] = useState<string>('ALL');
  const [testDelivery, setTestDelivery] = useState<string>('ALL');
  const [testVerification, setTestVerification] = useState<string>('ALL');
  const [testMinRating, setTestMinRating] = useState<number>(0);
  const [testSortBy, setTestSortBy] = useState<'trustScore' | 'rating' | 'priceAsc' | 'priceDesc'>('trustScore');

  // Filter panel toggle & overlay states
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setSpeechError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Esc keyboard key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setShowFilters(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [searchedExternal, setSearchedExternal] = useState(false);
  const [externalCount, setExternalCount] = useState(0);

  // CUSTOM SEARCH COMPLIANT STATES (Searches ONLY your local Firestore /videos collection)
  const [vidSearchSubject, setVidSearchSubject] = useState<string>('All');
  const [vidSearchChannel, setVidSearchChannel] = useState<string>('All');
  const [vidSearchDuration, setVidSearchDuration] = useState<string>('All');
  const [firestoreVideos, setFirestoreVideos] = useState<YouTubeVideo[]>([]);
  const [isSyncingVideos, setIsSyncingVideos] = useState<boolean>(false);

  // Real-time synchronization with the Firestore /videos collection
  useEffect(() => {
    setIsSyncingVideos(true);
    const q = query(collection(db, 'videos'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => doc.data() as YouTubeVideo);
      setFirestoreVideos(list);
      setIsSyncingVideos(false);
    }, (error) => {
      console.error("Failed to sync videos collection:", error);
      setIsSyncingVideos(false);
      handleFirestoreError(error, OperationType.GET, 'videos');
    });
    return () => unsubscribe();
  }, []);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examFilter, setExamFilter] = useState<string>('NEET');
  const [contentTypeFilter, setContentTypeFilter] = useState<'All' | 'lecture' | 'oneshot'>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'trustScore' | 'popularity'>('trustScore');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // PHASE 5: Server-side search API integration
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setServerSearchResults([]);
      setSearchSuggestions([]);
      setSearchedExternal(false);
      setExternalCount(0);
      return;
    }

    // Fetch Prefix-Trie / Autocomplete suggestions from Live Real indexed titles
    fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&examType=${examFilter}`)
      .then(res => res.json())
      .then(data => {
        if (data.suggestions) {
          setSearchSuggestions(data.suggestions);
        }
      })
      .catch(err => console.warn('Suggestions fetch failed:', err));

    // Debounced search result query with parameters (implementing Sequence 1-5 from requirement 5.1)
    const timeoutId = setTimeout(() => {
      setIsSearchingServer(true);
      fetch(`/api/search/global?q=${encodeURIComponent(searchQuery)}&examType=${examFilter}&subject=${subjectFilter}&contentType=${contentTypeFilter}&activeTab=${activeExploreTab || 'home'}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok') {
            setServerSearchResults(data.results || []);
            setSearchedExternal(data.searchedExternal || false);
            setExternalCount(data.externalCount || 0);
          }
        })
        .catch(err => console.error('[Global Search Sync Failed]:', err))
        .finally(() => {
          setIsSearchingServer(false);
        });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, examFilter, subjectFilter, contentTypeFilter, activeExploreTab]);

  // Trigger splash screen timer & force redirect on finish when auth loading is resolved
  useEffect(() => {
    if (showSplash && !loading) {
      const timer = setTimeout(() => {
        try {
          sessionStorage.setItem('biovised_splash_shown', 'true');
        } catch {}
        setShowSplash(false);
        // Recover state views from popstate history if they exist, instead of hard-redirecting to 'explore' / 'home'!
        const hState = window.history.state;
        if (hState && 'currentView' in hState) {
          setCurrentView(hState.currentView);
          setActiveExploreTab(hState.activeExploreTab);
          setActiveLecture(hState.activeLecture);
          setDetailModal(hState.detailModal);
        } else {
          setCurrentView('explore');
          setActiveExploreTab('home');
        }
      }, 500); // 500ms snappy response once loaded
      return () => clearTimeout(timer);
    }
  }, [showSplash, loading]);

  // Sync exam preferences when logged in or guest preference is loaded/updated
  useEffect(() => {
    if (user && user.examType) {
      const activeExam = user.examType === 'Both' ? 'NEET' : user.examType;
      localStorage.setItem('biovised_onboarding_exam', activeExam);
      setExamFilter(activeExam);
      setTestExamTag(activeExam);
    }
  }, [user]);

  // Load and sanitize Search History (expired > 15 days are removed)
  useEffect(() => {
    const fetchHistory = () => {
      let history: Array<{ query: string; ts: number }> = [];
      try {
        const stored = localStorage.getItem('biovised_search_history_v2');
        if (stored) history = JSON.parse(stored);
      } catch (err) {
        console.warn(err);
      }
      const now = Date.now();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      const filtered = history.filter(item => (now - item.ts) <= fifteenDaysMs);
      setSearchHistory(filtered);
    };
    fetchHistory();
  }, [currentView]);

  const recordSearchQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    let history: Array<{ query: string; ts: number }> = [];
    try {
      const stored = localStorage.getItem('biovised_search_history_v2');
      if (stored) history = JSON.parse(stored);
    } catch (err) {
      console.warn(err);
    }

    const cleaned = history.filter(item => {
      const isDuplicate = item.query.toLowerCase() === trimmed.toLowerCase();
      const isExpired = (now - item.ts) > fifteenDaysMs;
      return !isDuplicate && !isExpired;
    });

    const updated = [{ query: trimmed, ts: now }, ...cleaned].slice(0, 15);
    localStorage.setItem('biovised_search_history_v2', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const deleteSearchQuery = (query: string) => {
    let history: Array<{ query: string; ts: number }> = [];
    try {
      const stored = localStorage.getItem('biovised_search_history_v2');
      if (stored) history = JSON.parse(stored);
    } catch (err) {
      console.warn(err);
    }
    const updated = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    localStorage.setItem('biovised_search_history_v2', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  // Initial load of directories (once on mount) with automatic background persistence synchronization
  useEffect(() => {
    Promise.all([
      fetchTeachers().then(data => {
        setTeachers(data);
        try { localStorage.setItem('biovised_cached_teachers', JSON.stringify(data)); } catch (e) { console.warn(e); }
        return data;
      }),
      fetchInstitutes().then(data => {
        setInstitutes(data);
        try { localStorage.setItem('biovised_cached_institutes', JSON.stringify(data)); } catch (e) { console.warn(e); }
        return data;
      }),
      fetchLectures().then(data => {
        setLectures(data);
        try { localStorage.setItem('biovised_cached_lectures', JSON.stringify(data)); } catch (e) { console.warn(e); }
        return data;
      }),
      fetchPlaylists().then(data => {
        setPlaylists(data);
        try { localStorage.setItem('biovised_cached_playlists', JSON.stringify(data)); } catch (e) { console.warn(e); }
        return data;
      }),
      fetchBatches().then(data => {
        setBatches(data);
        try { localStorage.setItem('biovised_cached_batches', JSON.stringify(data)); } catch (e) { console.warn(e); }
        return data;
      })
    ]).then(() => {
      setIsInitialLoading(false);
    }).catch(err => {
      console.warn("Error resolving base datasets:", err);
      setIsInitialLoading(false);
    });
  }, []);

  // Sync user following list and handle view reset on sign out
  useEffect(() => {
    if (user) {
      fetchFollowingList().then(ids => setFollowedIds(ids));
    } else if (!loading) {
      // Completely logged out. Clear views to avoid rendering frozen dashboards.
      setCurrentView('explore');
      setActiveExploreTab('home');
      setActiveLecture(null);
      setDetailModal(null);
    }
  }, [user, loading]);

  // Real-time Played Video Feedback Loop
  useEffect(() => {
    if (activeLecture && user) {
      const watched = user.watchedContent || [];
      if (!watched.includes(activeLecture.id)) {
        updatePreferences({
          watchedContent: [...watched, activeLecture.id]
        }).catch(err => console.warn('History tracking failed:', err));
      }
    }
  }, [activeLecture, user]);

  const handleFollowToggle = async (t: TeacherProfile) => {
    if (isGuest || !user) {
      setAuthModalOpen(true);
      return;
    }
    const isFollowing = followedIds.includes(t.id);
    if (isFollowing) {
      setFollowedIds(prev => prev.filter(id => id !== t.id));
      await toggleFollow(t.id, t.name, t.avatar, isFollowing);
    } else {
      setFollowedIds(prev => [...prev, t.id]);
      await toggleFollow(t.id, t.name, t.avatar, isFollowing);
      await addRealNotification(
        "New Educator Followed",
        `You have successfully subscribed to ${t.name}. Direct stream-alert triggers are active!`,
        'follow'
      );
    }
  };

  // Filter application arrays through server search hits or local fallbacks
  const searchActive = currentView === 'search' && searchQuery.trim() !== '';

  const filteredTeachers = personalizeTeachers(
    searchActive
      ? (serverSearchResults.filter(r => r.type === 'teacher') as any[])
      : teachers.filter(t => {
          const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesSubject = subjectFilter === 'All' || t.subject === subjectFilter;
          const matchesExam = examFilter === 'All' || t.exams?.includes(examFilter as any);
          return matchesSearch && matchesSubject && matchesExam;
        }),
    user,
    examFilter,
    subjectFilter
  ).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'trustScore') return b.trustScore - a.trustScore;
    return b.followersCount - a.followersCount;
  }).filter(t => !verifiedOnly || (t.isVerified !== false && t.verified !== false && t.verificationStatus !== 'pending'));

  const getOneShotLecturesPerChapter = (list: Lecture[]): Lecture[] => {
    // 1. Filter out lectures that don't have thumbnails or are short < 30m or strategy/clickbait
    let validList = list.filter(l => 
      l.thumbnailUrl && 
      l.thumbnailUrl.trim() !== '' &&
      !isDurationBelow30Minutes(l.duration) &&
      !isStrategyOrHypeContent(l.title)
    );

    // Helper to parse duration to minutes
    const parseDurationToMinutes = (durationStr: string): number => {
      if (!durationStr) return 0;
      const dLower = durationStr.toLowerCase().trim();
      if (dLower.startsWith('pt')) {
        let minutes = 0;
        const hrsMatch = dLower.match(/(\d+)\s*h/);
        if (hrsMatch) minutes += parseInt(hrsMatch[1], 10) * 60;
        const minsMatch = dLower.match(/(\d+)\s*m/);
        if (minsMatch) minutes += parseInt(minsMatch[1], 10);
        return minutes;
      }
      let totalMinutes = 0;
      const hourMatch = dLower.match(/(\d+)\s*h/);
      if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
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
           if (!isNaN(numericOnly)) totalMinutes = numericOnly;
         }
      }
      return totalMinutes;
    };

    // Group by chapter
    const groups: Record<string, Lecture[]> = {};

    const guessChapter = (title: string): string => {
      const tLower = title.toLowerCase();
      const commonChapters = [
        "electrostatics", "current electricity", "magnetic effects", "induction", 
        "alternating current", "optics", "wave optics", "dual nature", "atoms", 
        "nuclei", "semiconductors", "kinematics", "laws of motion", "work power", 
        "rotational motion", "gravitation", "thermodynamics", "oscillations", "waves",
        "atomic structure", "chemical bonding", "states of matter", "equilibrium", 
        "redox", "coordination", "goc", "organic chemistry", "hydrocarbons", "amino", 
        "haloalkane", "haloarene", "alcohol", "phenol", "ether", "aldehyde", "ketone",
        "carboxylic", "biomolecule", "polymer", "solid state", "solution", 
        "electrochemistry", "kinetics", "surface chemistry", "diversity", "biology",
        "plant physiology", "human physiology", "reproduction", "genetics", "evolution"
      ];
      for (const ch of commonChapters) {
        if (tLower.includes(ch)) return ch;
      }
      return '';
    };

    validList.forEach(l => {
      let chName = (l.chapter || guessChapter(l.title)).trim();
      if (!chName) {
        chName = l.title.replace(/(?:part|pt|lecture|l|class|chap|chapter|part-|pt-)\s*([0-9]+)/ig, '').trim();
      }
      const key = chName.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(l);
    });

    const bestLectures: Lecture[] = [];
    Object.keys(groups).forEach(key => {
      const candidates = groups[key];
      if (candidates.length === 0) return;

      // Sort candidate videos:
      // Priority 1: Prefer full length lectures longer than 3 hours (180 minutes)
      // Priority 2: Sort descending by duration
      // Priority 3: Sort descending by views count
      candidates.sort((a, b) => {
        const durA = parseDurationToMinutes(a.duration);
        const durB = parseDurationToMinutes(b.duration);

        const over3HrsA = durA >= 180 ? 1 : 0;
        const over3HrsB = durB >= 180 ? 1 : 0;

        if (over3HrsA !== over3HrsB) {
          return over3HrsB - over3HrsA; // Over 3 hrs comes first!
        }
        if (durA !== durB) {
          return durB - durA; // Longest first!
        }
        return (b.viewsCount || 0) - (a.viewsCount || 0); // Most viewed fallback
      });

      bestLectures.push(candidates[0]);
    });

    return bestLectures;
  };

  const rawFilteredLectures = (searchActive
    ? (serverSearchResults.filter(r => r.type === 'lecture') as any[])
    : lectures.filter(l => {
        // Simple filter of content type before personalization sorting
        const matchesContent = contentTypeFilter === 'All' || 
          l.contentType === contentTypeFilter || 
          (contentTypeFilter === 'lecture' && l.contentType === 'playlist');
        return matchesContent;
      })).filter(l => l.verified === true || l.verificationStatus === 'verified');

  const personalizedRawLectures = personalizeLectures(
    rawFilteredLectures,
    user,
    examFilter,
    subjectFilter,
    searchQuery
  );

  const filteredLectures = getOneShotLecturesPerChapter(personalizedRawLectures);

  const filteredInstitutes = (searchActive
    ? serverSearchResults.filter(r => r.type === 'institute')
    : institutes.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExam = examFilter === 'All' || inst.exams?.includes(examFilter as any);
        return matchesSearch && matchesExam;
      })).filter(inst => !verifiedOnly || (inst.isVerified !== false && inst.verified !== false));

  const filteredPlaylists = personalizePlaylists(
    searchActive
      ? (serverSearchResults.filter(r => r.type === 'playlist') as any[])
      : playlists,
    user,
    examFilter,
    subjectFilter,
    searchQuery
  );

  const filteredBatches = (searchActive
    ? serverSearchResults.filter(r => r.type === 'batch')
    : batches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase());
        const currentExam = examFilter !== 'All' ? examFilter : (user?.examType || 'Both');
        if (currentExam !== 'Both' && currentExam !== 'All' && b.examType && b.examType !== 'Both' && b.examType !== 'All' && b.examType !== currentExam) {
          return false;
        }
        const matchesExam = examFilter === 'All' || b.examType === examFilter || b.examType === 'Both';
        const matchesSubject = subjectFilter === 'All' || b.subject === subjectFilter;
        return matchesSearch && matchesExam && matchesSubject;
      })).filter(b => !verifiedOnly || (b.verified !== false));

  const filteredTestSeries = (TEST_SERIES_CATALOG || []).filter(ts => {
    const matchesSearch = ts.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ts.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ts.description.toLowerCase().includes(searchQuery.toLowerCase());
    const currentExam = examFilter !== 'All' ? examFilter : (user?.examType || 'Both');
    if (currentExam !== 'Both' && currentExam !== 'All' && ts.examType && ts.examType !== 'Both' && ts.examType !== 'All' && ts.examType !== currentExam) {
      return false;
    }
    return matchesSearch;
  });

  if (showSplash) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans selection:bg-white selection:text-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-5 sm:gap-6 animate-fade-in"
        >
          {/* Dynamic and authentic SVG representation of the BioVised squircle logo */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[20px] sm:rounded-[24px] flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)] shrink-0">
            <span className="text-black font-sans font-black text-3xl sm:text-4xl select-none tracking-tight">B</span>
            {/* The white logo contains a small black dot next to the B */}
            <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-black rounded-full" />
          </div>

          <div className="flex flex-col text-left pl-1">
            <h1 className="text-white text-3xl sm:text-5xl font-bold tracking-tight font-sans leading-none flex flex-col justify-start select-none">
              BioVised
            </h1>
            {/* White dot at the bottom left under B */}
            <span className="w-1.5 h-1.5 bg-white rounded-full mt-2 ml-0.5 animate-pulse" />
          </div>
        </motion.div>
        
        {/* Progress bar loop */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "250%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 left-0 w-20 bg-white/95 rounded-full"
          />
        </div>
      </div>
    );
  }



  const getCategorySuggestions = (tab: string) => {
    switch (tab) {
      case 'tests':
        return ["NEET Full", "Allen Major", "JEE Main Spec", "Physics Part Test", "Calculus Suite"];
      case 'teachers':
        return ["HC Verma", "NV Sir", "Organic Chemistry", "Biology Expert", "Aman Sir"];
      case 'playlists':
        return ["11th Physics", "Inorganic Series", "JEE Advanced Maths", "Full NEET Revision"];
      case 'batches':
        return ["Alpha Batch", "Target 2026", "Revision Cohort", "Crash Course"];
      case 'lecture':
        return ["Electrostatics", "Chemical Kinetics", "Rotational Motion", "Cell Division", "Photosynthesis"];
      case 'institutes':
        return ["Kota Hub", "Aakash Digital", "Motion Education", "Allen Classes"];
      default:
        return ["Physics", "Chemistry", "Maths", "Biology"];
    }
  };

  const getActiveSegmentMatchesCount = (tab: string) => {
    switch (tab) {
      case 'tests':
        return 16;
      case 'teachers':
        return filteredTeachers?.length || 0;
      case 'playlists':
        return filteredPlaylists?.length || 0;
      case 'batches':
        return filteredBatches?.length || 0;
      case 'lecture':
        return filteredLectures?.length || 0;
      case 'institutes':
        return filteredInstitutes?.length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-accent flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* Loading lectures overlay */}
      {isLoadingLectures && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 select-none">
          <div className="relative w-12 h-12 bg-white rounded-xl flex items-center justify-center animate-bounce shadow-2xl">
            <span className="text-black font-sans font-bold text-lg select-none">B</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 animate-pulse">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Opening Playlist Channel</span>
            <span className="text-[10px] font-mono text-[#2DD4BF] uppercase tracking-wider">Syncing Lecture Nodes via YouTube API</span>
          </div>
          <div className="w-32 h-[1px] bg-neutral-900 relative overflow-hidden rounded-full mt-2">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 top-0 bottom-0 w-12 bg-emerald-400 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Fixed top Header segment */}
      <Header
        onSearchChange={(q) => {
          setSearchQuery(q);
        }}
        onSearchSubmit={() => {}}
        onViewDashboard={(view) => {
          setCurrentView(view);
          if (view === 'explore') {
            setIsSearchFocused(false);
          }
        }}
        currentView={currentView}
        searchVal={searchQuery}
        activeExploreTab={activeExploreTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        notifications={notifications}
        showFilters={showFilters}
        onToggleFilters={() => setSpecsModalOpen(true)}
        isFilterSupported={currentView === 'explore' || currentView === 'search'}
        onFocus={() => {
          if (currentView === 'explore') {
            setIsSearchFocused(true);
          }
        }}
        searchSuggestions={searchSuggestions}
        currentExamType={examFilter}
        onVoiceSearchClick={startSpeechRecognition}
      />

      {/* Modern Slide-Down Unified Multi-Filter Panel like YouTube but tailored to tabs */}
      <AnimatePresence>
        {showFilters && currentView === 'explore' && (
          <motion.div
            id="unified-multi-filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="bg-[#090909] border-b border-[#1A1A1A] overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-5 md:px-8 space-y-4 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-[#141414]">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 flex-row">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                  {activeExploreTab === 'tests' 
                    ? 'Target test matrix variables' 
                    : `Filter profile: ${activeExploreTab?.toUpperCase()}`
                  }
                </span>
                <button
                  onClick={() => {
                    const defaultExam = user?.examType === 'Both' ? 'NEET' : (user?.examType || 'NEET');
                    if (activeExploreTab === 'tests') {
                      setTestExamTag(defaultExam);
                      setTestDelivery('ALL');
                      setTestVerification('ALL');
                      setTestMinRating(0);
                    } else {
                      setSubjectFilter('All');
                      setExamFilter(defaultExam);
                      setContentTypeFilter('All');
                    }
                  }}
                  className="text-[10px] font-mono font-bold text-[#FF5A1F] hover:underline uppercase cursor-pointer"
                >
                  Reset Parameters
                </button>
              </div>

              {activeExploreTab === 'tests' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs text-zinc-350">

                  {/* Delivery Mode */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Delivery Mode</span>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'ONLINE', 'OFFLINE'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setTestDelivery(mode)}
                          className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-colors ${
                            testDelivery === mode
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verification status */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Verification</span>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'VERIFIED', 'UNVERIFIED'].map(v => (
                        <button
                          key={v}
                          onClick={() => setTestVerification(v)}
                          className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-colors ${
                            testVerification === v
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {v === 'ALL' ? 'All' : v === 'VERIFIED' ? 'Verified' : 'Manual'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Min Rating</span>
                    <div className="pt-1">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={testMinRating}
                        onChange={(e) => setTestMinRating(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded-lg outline-none"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                        <span>Any</span>
                        <span className="text-emerald-400 font-bold">{testMinRating}★+</span>
                        <span>5★</span>
                      </div>
                    </div>
                  </div>

                  {/* Sort parameter */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Sort By</span>
                    <select
                      value={testSortBy}
                      onChange={(e) => setTestSortBy(e.target.value as any)}
                      className="bg-[#111113] border border-zinc-850 rounded px-2.5 py-1.5 text-[11px] font-sans text-zinc-300 outline-none w-full"
                    >
                      <option value="trustScore">Trust Score (High)</option>
                      <option value="rating">Rating (High to Low)</option>
                      <option value="priceAsc">Price (Low to High)</option>
                      <option value="priceDesc">Price (High to Low)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs text-zinc-350">
                  {/* Subject selector */}
                  {activeExploreTab !== 'batches' && activeExploreTab !== 'institutes' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Preferred Subject</span>
                      <div className="flex flex-wrap gap-1">
                        {['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'].map(sub => (
                          <button
                            key={sub}
                            onClick={() => setSubjectFilter(sub)}
                            className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-all ${
                              subjectFilter === sub
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}



                  {/* Format selector for lectures tab */}
                  {activeExploreTab === 'lecture' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Lesson Format</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'All', label: 'All Lectures' },
                          { id: 'lecture', label: 'Standard Chapters' },
                          { id: 'oneshot', label: 'One-shots Only' }
                        ].map(ct => (
                          <button
                            key={ct.id}
                            onClick={() => setContentTypeFilter(ct.id as any)}
                            className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-all ${
                              contentTypeFilter === ct.id
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`flex-1 ${activeLecture ? 'pb-0' : 'pb-32'}`}>
          
          {/* Main conditional views manager */}
          {currentView === 'search' ? (
            <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 text-left pb-24 min-h-[80vh]">
              {/* Voice Listening Portal / Back Controls Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                <h3 className="text-sm font-sans font-bold text-white tracking-tight flex items-center gap-2">
                  Search Results
                </h3>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentView('explore');
                  }}
                  className="text-xs font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-zinc-900 bg-[#0A0A0B] hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  ← Close Search
                </button>
              </div>

              {/* Speech Error Banner - Handling not-allowed blocked permission states gracefully */}
              {speechError && (
                <div className="bg-red-950/45 border border-red-900/60 text-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wider text-red-400">Microphone Access Restricted</p>
                    <p className="text-zinc-350 leading-relaxed max-w-2xl">
                      {speechError === 'not-allowed' 
                        ? 'Microphone permission was blocked or denied. Since this app is running in an iframe preview, please click the site settings, or allow microphone access in your browser.' 
                        : `Speech recognition encountered an issue: "${speechError}".`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSpeechError(null)}
                    className="self-start sm:self-center bg-red-900/40 hover:bg-red-900/60 hover:text-white text-zinc-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Listening Overlay Portal */}
              {isListening && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center gap-6 select-none animate-in fade-in duration-200">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 bg-red-500/20 rounded-full animate-ping" />
                    <div className="absolute w-20 h-20 bg-red-500/10 rounded-full animate-pulse" />
                    <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl relative z-10 transition-transform active:scale-95">
                      <Mic className="w-7 h-7 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-lg font-bold tracking-wider uppercase text-white font-sans animate-pulse">
                      Listening...
                    </h3>
                    <p className="text-xs text-zinc-450 font-mono">
                      Say what you want to seek on Biovised
                    </p>
                  </div>

                  <button
                    onClick={() => setIsListening(false)}
                    className="mt-8 px-6 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Main view routing logic: if searchQuery is empty feel, show absolutely nothing as in Pic 2 */}
              {searchQuery.trim() === '' ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700 font-mono text-center select-none">
                  {/* Absolute clean void - zero logs, history or clutter as requested */}
                </div>
              ) : (() => {
                const showLectures = activeExploreTab === 'home' || activeExploreTab === 'lecture';
                const showTeachers = activeExploreTab === 'home' || activeExploreTab === 'teachers';
                const showPlaylists = activeExploreTab === 'home' || activeExploreTab === 'playlists';
                const showBatches = activeExploreTab === 'home' || activeExploreTab === 'batches';
                const showTests = activeExploreTab === 'home' || activeExploreTab === 'tests';
                const showInstitutes = activeExploreTab === 'home' || activeExploreTab === 'institutes';

                return (
                  /* Results Displayed (Strictly Personalize To Chosen Exam and Active Category Tab) */
                  <div className="space-y-8 pt-2">
                    <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {activeExploreTab === 'home' ? `Global Catalog (${examFilter} stream)` : `Category Search: ${activeExploreTab?.toUpperCase()}`}
                      </h3>
                      {activeExploreTab !== 'home' && (
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Filtered specifically inside {activeExploreTab}</span>
                      )}
                    </div>

                    {/* 1. Lectures Results */}
                    {showLectures && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching video lessons ({filteredLectures.length})</h4>
                        {filteredLectures.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No curriculum lessons matches your search.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {filteredLectures.map(lec => {
                              const formattedSub = "182K";
                              const lectureDto = {
                                ...lec,
                                channel: {
                                  id: lec.teacherId || 'unknown',
                                  name: lec.teacherName || 'Verified Educator',
                                  avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120',
                                  bannerUrl: null,
                                  subscriberCountRaw: 182000,
                                  subscriberCountFormatted: formattedSub
                                }
                              };

                              return (
                                <LectureCard
                                  key={lec.id}
                                  lecture={lectureDto as any}
                                  onClick={() => {
                                    recordSearchQuery(searchQuery);
                                    setActiveLecture(lec);
                                    setCurrentView('explore');
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. Educators Results */}
                    {showTeachers && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching educators & scholars ({filteredTeachers.length})</h4>
                        {filteredTeachers.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No specialists found for the selected category.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredTeachers.map(t => (
                              <div key={t.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex gap-4 text-left items-center">
                                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-800" />
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div>
                                    <h5 className="text-xs font-bold text-white uppercase tracking-tight">{t.name}</h5>
                                    <span className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">Specialist Mentor</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        recordSearchQuery(searchQuery);
                                        setDetailModal({ id: t.id, type: 'teacher' });
                                      }}
                                      className="text-[9px] font-mono uppercase bg-zinc-900 hover:bg-zinc-950 px-3 py-1 rounded-full border border-neutral-800 text-white cursor-pointer"
                                    >
                                      Portal
                                    </button>
                                    <button
                                      onClick={() => handleFollowToggle(t)}
                                      className="text-[9px] font-mono uppercase px-3 py-1 bg-zinc-950 text-zinc-400 hover:text-white rounded-full border border-neutral-800 cursor-pointer"
                                    >
                                      {followedIds.includes(t.id) ? 'Followed' : 'Follow'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Playlist Channels Results */}
                    {showPlaylists && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching curated playlists ({filteredPlaylists.length})</h4>
                        {filteredPlaylists.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No curated playlist channels match the query.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredPlaylists.map(p => (
                              <div key={p.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between text-left gap-3">
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-white uppercase tracking-tight mt-1 line-clamp-1">{p.title}</h5>
                                  <p className="text-[10px] text-zinc-450 leading-relaxed line-clamp-2">{p.description}</p>
                                </div>
                                <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <span>By {p.teacherName}</span>
                                  <button
                                    onClick={() => {
                                      recordSearchQuery(searchQuery);
                                      handleSelectPlaylist(p);
                                    }}
                                    className="text-white hover:underline text-[9px] uppercase font-bold"
                                  >
                                    View Folder
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. Live Batches Results */}
                    {showBatches && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching live student cohorts ({filteredBatches.length})</h4>
                        {filteredBatches.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No structured course batches available.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredBatches.map(b => (
                              <BatchCard
                                key={b.id}
                                batch={b}
                                onClick={() => setDetailModal({ id: b.id, type: 'batch' as any })}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. Mock Test Series Results */}
                    {showTests && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching mock test series ({filteredTestSeries.length})</h4>
                        {filteredTestSeries.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No mock test series available.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredTestSeries.map(ts => (
                              <div key={ts.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between text-left gap-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-350 px-2 py-0.5 rounded uppercase">{ts.examType}</span>
                                    <span className="text-[10px] font-mono text-white/50">{ts.subjects ? ts.subjects[0] : 'Syllabus Mapped'}</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-white uppercase truncate tracking-tight">{ts.name}</h5>
                                  <p className="text-[10px] text-zinc-405 line-clamp-1">{ts.description}</p>
                                </div>
                                <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <DynamicRating targetId={ts.id} className="text-zinc-500 font-mono text-[9px] flex items-center gap-1" textClassName="hidden" />
                                  <button
                                    onClick={() => {
                                      setCurrentView('explore');
                                      setActiveExploreTab('tests');
                                    }}
                                    className="text-white hover:underline text-[9px] uppercase font-bold"
                                  >
                                    Go To Tests
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. Active Institutes Results */}
                    {showInstitutes && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-mono tracking-widest text-[#666] uppercase">Matching academic institutes ({filteredInstitutes.length})</h4>
                        {filteredInstitutes.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No matched affiliate portals found.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredInstitutes.map(inst => (
                              <div key={inst.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex gap-4 text-left items-center">
                                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-neutral-800 flex items-center justify-center font-mono text-zinc-405 text-lg font-bold uppercase">
                                  {inst.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-bold text-white uppercase tracking-tight">{inst.name}</h5>
                                  <p className="text-[9px] text-zinc-500 font-mono">TRUST SCORE: {inst.trustRank}%</p>
                                  <button
                                    onClick={() => {
                                      setCurrentView('explore');
                                      setActiveExploreTab('institutes');
                                    }}
                                    className="text-[9px] font-mono text-white hover:underline mt-1 block"
                                  >
                                    Visit Hub
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : currentView === 'profile' && user ? (
            <ProfileDashboard
              onSelectLecture={(lec) => {
                setActiveLecture(lec);
                setCurrentView('explore');
              }}
              onOpenTeacher={(teacherId) => setDetailModal({ id: teacherId, type: 'teacher' })}
              activeLecture={activeLecture}
            />
          ) : currentView === 'moderator' && user?.email === 'adarshaman898@gmail.com' ? (
            <ModeratorDashboard />
          ) : currentView === 'notifications' ? (
            <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 text-left pb-24 min-h-[80vh]">
              <NotificationsDashboard
                notifications={notifications}
                onDismiss={handleNotificationDismiss}
                onNotificationClick={handleNotificationClick}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onViewDashboard={(view) => {
                  if (view === 'explore') {
                    handleBackNavigation();
                  } else {
                    setCurrentView(view as any);
                  }
                }}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            </div>
          ) : (
            // Explore View (Main Discovery Screen)
            <>
              {activeLecture ? (
                /* Dedicated Video Player View (Plays in its own clean page to prevent design collapse) */
                <div className="min-h-[80vh] flex flex-col pb-4 text-left">
                  <div className="w-full">
                    <VideoPlayer
                      lecture={activeLecture}
                      onClose={handleBackNavigation}
                      playlistLectures={lectures.filter(l => l.playlistId === activeLecture.playlistId)}
                      onSelectLecture={setActiveLecture}
                    />
                  </div>
                </div>
              ) : (
                <>

              {/* Main Tab Controller Content */}
              {searchQuery !== '' && activeExploreTab === 'home' ? (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24 text-left font-sans">
                  {/* Search Results Summary Header */}
                  <div className="bg-[#111113] rounded-2xl p-6 border border-neutral-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🔍 VERIFIED VIDEO SEARCH</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Scanning verified Firestore <span className="text-white font-semibold">videos</span> catalog for <span className="text-orange-400 font-bold">"{searchQuery}"</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => {
                          setVidSearchSubject('All');
                          setVidSearchChannel('All');
                          setVidSearchDuration('All');
                        }}
                        className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-neutral-800 hover:border-neutral-700 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        Reset Filters
                      </button>

                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-750 text-zinc-105 hover:text-white text-xs font-bold uppercase rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  {/* Filter selectors requested: Subject, Channel, Duration */}
                  <div className="bg-[#0A0A0C] border border-neutral-900 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Subject Tag Selector</label>
                      <select
                        value={vidSearchSubject}
                        onChange={(e) => setVidSearchSubject(e.target.value)}
                        className="w-full bg-[#111113] border border-neutral-800 rounded-xl text-xs text-white p-2.5 outline-none focus:border-orange-500/50"
                      >
                        <option value="All">All Subjects</option>
                        {Array.from(new Set(firestoreVideos.map(v => v.subject).filter(Boolean))).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Channel Brand Filter</label>
                      <select
                        value={vidSearchChannel}
                        onChange={(e) => setVidSearchChannel(e.target.value)}
                        className="w-full bg-[#111113] border border-neutral-800 rounded-xl text-xs text-white p-2.5 outline-none focus:border-orange-500/50"
                      >
                        <option value="All">All Channels</option>
                        {Array.from(new Set(firestoreVideos.map(v => v.channelName).filter(Boolean))).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Duration Class</label>
                      <div className="grid grid-cols-4 gap-1 bg-[#111113] p-1 border border-neutral-800 rounded-xl">
                        {(['All', 'Short', 'Medium', 'Long'] as const).map(dur => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setVidSearchDuration(dur)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer text-center ${
                              vidSearchDuration === dur
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {dur === 'All' ? 'All' : dur === 'Short' ? '<30m' : dur === 'Medium' ? '1-3h' : '>4h'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Matching results list rendering */}
                  <section className="space-y-4">
                    {(() => {
                      const queryClean = searchQuery.trim().toLowerCase();
                      const parseDurToSec = (durStr?: string): number => {
                        if (!durStr) return 0;
                        if (durStr.startsWith('PT') || durStr.startsWith('PST')) {
                          let hrs = 0; let mins = 0; let secs = 0;
                          const hM = durStr.match(/(\d+)H/); if (hM) hrs = parseInt(hM[1], 10);
                          const mM = durStr.match(/(\d+)M/); if (mM) mins = parseInt(mM[1], 10);
                          const sM = durStr.match(/(\d+)S/); if (sM) secs = parseInt(sM[1], 10);
                          return (hrs * 3600) + (mins * 60) + secs;
                        }
                        const pts = durStr.split(':').map(Number);
                        if (pts.length === 3) return (pts[0] * 3600) + (pts[1] * 60) + pts[2];
                        if (pts.length === 2) return (pts[0] * 60) + pts[1];
                        return parseInt(durStr, 10) || 0;
                      };

                      const results = firestoreVideos.filter(v => {
                        // Keyword Query Match inside Title, Subject, Channel Name, Topic
                        if (queryClean) {
                          const inTitle = v.title?.toLowerCase().includes(queryClean);
                          const inSubject = v.subject?.toLowerCase().includes(queryClean);
                          const inChannel = v.channelName?.toLowerCase().includes(queryClean);
                          const inTopic = v.topic?.toLowerCase().includes(queryClean);
                          if (!inTitle && !inSubject && !inChannel && !inTopic) {
                            return false;
                          }
                        }

                        // Subject Filter
                        if (vidSearchSubject !== 'All' && v.subject !== vidSearchSubject) {
                          return false;
                        }

                        // Channel Filter
                        if (vidSearchChannel !== 'All' && v.channelName !== vidSearchChannel) {
                          return false;
                        }

                        // Duration Filter (Short < 30m / Medium 1-3hrs / Long > 4h)
                        if (vidSearchDuration !== 'All') {
                          const sec = v.durationSeconds || parseDurToSec(v.duration) || 0;
                          if (vidSearchDuration === 'Short') {
                            if (sec >= 1800) return false;
                          } else if (vidSearchDuration === 'Medium') {
                            if (sec < 1800 || sec > 10800) return false;
                          } else if (vidSearchDuration === 'Long') {
                            if (sec <= 14400) return false;
                          }
                        }

                        return true;
                      });

                      const getPlaylistTitle = (playlistId: string): string => {
                        const pl = playlists.find(p => p.id === playlistId || p.playlistId === playlistId);
                        return pl ? pl.title : "Academic Course Playlist";
                      };

                      if (isSyncingVideos) {
                        return (
                          <div className="py-12 text-center text-zinc-400 font-mono text-xs">
                            Syncing Firestore videos in real-time...
                          </div>
                        );
                      }

                      if (results.length === 0) {
                        return (
                          <div className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#0B0B0C] rounded-2xl border border-neutral-900">
                            No videos matched search parameter bounds.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {results.map((v) => {
                            const ytId = v.videoId || v.id;
                            const playlistName = getPlaylistTitle(v.playlistId);
                            return (
                              <div
                                key={v.id}
                                onClick={() => {
                                  // Map YouTubeVideo to Lecture spec and play
                                  const mapped: Lecture = {
                                    id: ytId,
                                    title: v.title,
                                    description: v.description || "",
                                    videoUrl: `https://www.youtube.com/embed/${ytId}`,
                                    thumbnailUrl: v.thumbnail || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                                    subject: v.subject || "Mixed",
                                    examType: v.examTags?.[0] || "JEE/NEET",
                                    contentType: "lecture",
                                    teacherId: "imported",
                                    teacherName: v.channelName || "Teacher",
                                    playlistId: v.playlistId,
                                    duration: v.duration || "10:00",
                                    viewsCount: v.viewCount || 0,
                                    likesCount: v.likeCount || 0,
                                    createdAt: v.importedAt || new Date().toISOString(),
                                    youtubeVideoId: ytId
                                  };
                                  setActiveLecture(mapped);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-[#111113] border border-neutral-900 rounded-2xl overflow-hidden hover:border-neutral-800 hover:bg-[#141416] transition-all flex flex-col justify-between cursor-pointer group p-3 text-left space-y-3"
                              >
                                {/* Thumbnail */}
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-neutral-950 shrink-0">
                                  <YoutubeThumbnailImg videoId={ytId} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono font-bold tracking-wider bg-black/85 px-2 py-0.5 rounded text-white uppercase">
                                    {v.duration || "10:00"}
                                  </span>
                                </div>

                                {/* Content Details */}
                                <div className="space-y-2 flex-grow flex flex-col justify-between">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[8px] font-mono font-bold uppercase bg-neutral-900 text-zinc-400 border border-neutral-800 px-2 py-0.5 rounded">
                                        {v.subject}
                                      </span>
                                      {v.topic && (
                                        <span className="text-[8px] font-mono font-bold uppercase bg-orange-950/25 text-orange-400 border border-orange-500/10 px-2 py-0.5 rounded">
                                          {v.topic}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs font-bold text-white tracking-tight leading-snug line-clamp-2 uppercase">
                                      {v.title}
                                    </h4>
                                  </div>

                                  <div className="space-y-1 pt-2 border-t border-neutral-900/50">
                                    <p className="text-[10px] text-zinc-400 font-bold truncate">
                                      Channel: <span className="text-white">{v.channelName}</span>
                                    </p>
                                    <p className="text-[10px] text-zinc-500 truncate font-mono">
                                      Playlist: <span className="text-zinc-400">{playlistName}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>
                </div>
              ) : (
                <>
                  {activeExploreTab === 'home' && (
                    <HomeDashboard
                      lectures={lectures}
                      teachers={teachers}
                      institutes={institutes}
                      onViewAll={(tab) => {
                        setActiveExploreTab(tab);
                        setSearchQuery('');
                        setShowFilters(false);
                        setIsSearchFocused(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onSelectLecture={setActiveLecture}
                      onSelectTeacher={(id) => setDetailModal({ id, type: 'teacher' })}
                      onSelectInstitute={(id) => setDetailModal({ id, type: 'institute' })}
                    />
                  )}

              {activeExploreTab === 'lecture' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24 text-left">
                  {/* Search Video Lectures list results */}
                  <section className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-zinc-400" /> Channel Chapters & Lectures ({filteredLectures.length})
                      </h3>
                    </div>

                    {isInitialLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <LectureCardSkeleton key={idx} />
                        ))}
                      </div>
                    ) : filteredLectures.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No video lessons registered matching search parameter bounds.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredLectures.map((lec) => {
                          const formattedSub = "182K";
                          const lectureDto = {
                            ...lec,
                            channel: {
                              id: lec.teacherId || 'unknown',
                              name: lec.teacherName || 'Verified Educator',
                              avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120',
                              bannerUrl: null,
                              subscriberCountRaw: 182000,
                              subscriberCountFormatted: formattedSub
                            }
                          };

                          return (
                            <LectureCard
                              key={lec.id}
                              lecture={lectureDto as any}
                              onClick={() => {
                                recordSearchQuery(searchQuery);
                                setActiveLecture(lec);
                                setCurrentView('explore');
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeExploreTab === 'teachers' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-400" /> NEET & JEE REGISTERED EDUCATORS DIRECTORY ({filteredTeachers.length})
                    </h3>
                  </div>

                  {isInitialLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <TeacherCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : filteredTeachers.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono">No educators listed matching criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {filteredTeachers.map((t) => (
                        <div
                          key={t.id}
                          className="bg-[#111111] rounded-2xl p-6 flex flex-col justify-between gap-4 hover:bg-[#141414] transition-all text-left relative overflow-hidden"
                        >
                          <div className="space-y-3.5">
                            <div className="flex justify-between items-start">
                              <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                              {t.isVerified ? (
                                <div className="text-right">
                                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Trust Score</span>
                                  {t.trustScore === null || t.trustScore === undefined || t.trustScore === 0 ? (
                                    <span className="text-[9px] font-mono font-medium text-orange-400 bg-zinc-800 px-2 py-0.5 rounded leading-none block">No Data</span>
                                  ) : (
                                    <span className="text-xs font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-350">{t.trustScore}/100</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-right">
                                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Status</span>
                                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded leading-none block">Unverified</span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-white tracking-tight uppercase truncate max-w-[150px]">{t.name}</h4>
                                {t.isVerified && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" title="Verified Profile" />
                                )}
                              </div>
                              <span className="text-[9px] text-zinc-400 font-mono uppercase block mt-1 tracking-wide">{t.subject} Specialist</span>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{t.bio}</p>
                          </div>

                          <div className="space-y-3.5 pt-3.5 border-t border-[#262626]">
                            <DynamicRating 
                              targetId={t.id}
                              className="flex justify-between items-center text-[10px] font-mono w-full"
                              starClassName="text-amber-500 font-sans flex items-center gap-1"
                              textClassName="text-zinc-500 uppercase ml-auto"
                            />

                            {/* Actions line */}
                            <div className="flex gap-2 text-xs">
                              <button
                                onClick={() => setDetailModal({ id: t.id, type: 'teacher' })}
                                className="flex-1 bg-[#0A0A0A] hover:bg-zinc-950 text-white py-1.5 rounded-full text-center cursor-pointer font-bold transition-all text-[11px] uppercase tracking-wide"
                              >
                                Portal
                              </button>
                              <button
                                onClick={() => handleFollowToggle(t)}
                                className={`px-4 rounded-full border border-[#222222] font-mono transition-all cursor-pointer text-[10px] uppercase tracking-wide ${
                                  followedIds.includes(t.id)
                                    ? 'border-white bg-[#171717] text-white'
                                    : 'hover:border-zinc-500 text-zinc-400 hover:text-white bg-[#0A0A0A]'
                                }`}
                              >
                                {followedIds.includes(t.id) ? 'Followed' : 'Follow'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeExploreTab === 'playlists' && (
                <VideoLibrary onBackToHome={() => setActiveExploreTab('home')} />
              )}

              {activeExploreTab === 'batches' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-zinc-400" /> REGISTERED LIVE COURSE BATCHES ({filteredBatches.length})
                    </h3>
                  </div>

                  {isInitialLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 animate-fade-in">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <BatchCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No live student cohorts or batches match the selected criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 p-0.5">
                      {filteredBatches.map((b) => (
                        <BatchCard
                          key={b.id}
                          batch={b}
                          onClick={() => setDetailModal({ id: b.id, type: 'batch' as any })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeExploreTab === 'tests' && (
                <TestSeriesDirectory 
                  searchQuery={searchQuery}
                  selectedExamTag={testExamTag}
                  setSelectedExamTag={setTestExamTag}
                  selectedDelivery={testDelivery}
                  setSelectedDelivery={setTestDelivery}
                  selectedVerification={testVerification}
                  setSelectedVerification={setTestVerification}
                  minRating={testMinRating}
                  setMinRating={setTestMinRating}
                  sortBy={testSortBy}
                  setSortBy={setTestSortBy}
                />
              )}

              {activeExploreTab === 'institutes' && (
                <div id="institutes-directory-root" className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left font-sans">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-400" /> NEET & JEE VERIFIED ACADEMIC CHANNELS ({filteredInstitutes.length})
                    </h3>
                  </div>

                  {isInitialLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <InstituteCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : filteredInstitutes.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No affiliated academies match the selected criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredInstitutes.map((inst) => (
                        <InstituteCard
                          key={inst.id}
                          institute={inst}
                          onViewHub={() => setDetailModal({ id: inst.id, type: 'institute' })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </>
          )}

              {/* Exact Mock Screenshot Match Footer Navigation Bar (Hidden when activeLecture is playing to block distraction) */}
              {!activeLecture && (
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#060606]/98 border-t border-[#121212]/95 shadow-2xl h-[58px] xs:h-[72px] px-1 xs:px-4 md:px-8 flex justify-around items-center backdrop-blur-md select-none">
                <div className="flex justify-around items-center w-full max-w-5xl mx-auto h-full gap-0.5 xs:gap-1.5 flex-nowrap overflow-hidden">
                  {[
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'teachers', label: 'Teachers', icon: Users },
                    { id: 'playlists', label: 'Verse', icon: PlaySquare },
                    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
                    { id: 'batches', label: 'Batches', icon: Layers },
                    { id: 'lecture', label: 'Lecture', icon: Video },
                    { id: 'institutes', label: 'Channels', icon: Building2 }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isActive = currentView === 'explore' && activeExploreTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setCurrentView('explore');
                          const targetTab = t.id as any;
                          setActiveExploreTab(targetTab);
                          setSearchQuery('');
                          setShowFilters(false);
                          setIsSearchFocused(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 min-w-0 h-full flex flex-col items-center justify-center cursor-pointer relative py-0.5 focus:outline-none transition-all duration-200"
                      >
                        <div className={`p-0.5 xs:p-1 py-1 xs:py-1.5 rounded-xl xs:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 w-full max-w-[46px] xs:max-w-[74px] sm:max-w-[92px] h-[48px] xs:h-[56px] min-w-0 ${
                          isActive 
                            ? 'bg-[#121212]/90 border border-zinc-800/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                            : 'bg-transparent border border-transparent opacity-60 hover:opacity-100'
                        }`}>
                          <Icon className={`w-[18px] h-[18px] xs:w-[21px] xs:h-[21px] sm:w-[24px] sm:h-[24px] mb-1 transition-colors ${isActive ? 'text-white' : 'text-zinc-450'}`} strokeWidth={1.8} />
                          <span className={`text-[7.5px] xs:text-[9.5px] sm:text-[10px] font-sans font-bold tracking-tighter xs:tracking-tight text-center leading-none truncate w-full px-0.5 ${isActive ? 'text-white font-extrabold' : 'text-zinc-500'}`}>
                            {t.label}
                          </span>
                          
                          {isActive ? (
                            <motion.div 
                              layoutId="navMinimalistWhiteDot"
                              className="w-1 h-1 bg-white rounded-full mt-1 shadow-[0_0_6px_rgba(255,255,255,0.9)]" 
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            />
                          ) : (
                            <div className="w-1 h-1 bg-transparent mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </nav>
              )}
            </>
          )}

        </main>

      {/* Structured details review modal view */}
      {detailModal && (
        <DetailsModal
          isOpen={!!detailModal}
          onClose={handleBackNavigation}
          targetType={detailModal.type}
          targetId={detailModal.id}
          onSelectLecture={(lec) => {
            setActiveLecture(lec);
            setCurrentView('explore');
          }}
        />
      )}

      {/* Authorized Popup user overlays */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Onboarding gateway portal for first-time visits */}
      <OnboardingGateway
        onOpenAuth={(mode) => {
          setAuthModalOpen(true);
        }}
      />

      <SearchSpecsModal
        isOpen={specsModalOpen}
        onClose={() => setSpecsModalOpen(false)}
        subjectFilter={subjectFilter as any}
        setSubjectFilter={setSubjectFilter as any}
        examFilter={examFilter}
        setExamFilter={setExamFilter}
        contentTypeFilter={contentTypeFilter as any}
        setContentTypeFilter={setContentTypeFilter as any}
        sortBy={sortBy as any}
        setSortBy={setSortBy as any}
        searchQuery={searchQuery}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        activeExploreTab={activeExploreTab}
        testExamTag={testExamTag}
        setTestExamTag={setTestExamTag}
        testDelivery={testDelivery}
        setTestDelivery={setTestDelivery}
        testVerification={testVerification}
        setTestVerification={setTestVerification}
        testMinRating={testMinRating}
        setTestMinRating={setTestMinRating}
        testSortBy={testSortBy}
        setTestSortBy={setTestSortBy}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <AppContent />
      </SearchProvider>
    </AuthProvider>
  );
}
