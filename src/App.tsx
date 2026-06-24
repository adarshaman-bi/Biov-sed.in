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
// OnboardingGateway removed to allow direct guest access on launch
import NotificationsDashboard from './components/NotificationsDashboard';
import SearchSpecsModal from './components/SearchSpecsModal';
import {
  personalizeLectures,
  personalizePlaylists,
  personalizeTeachers
} from './services/recommendationEngine';
import { supabase } from './utils/supabaseClient';
import localMasterImport from './data/biovised_master_firestore_import.json';
import localPlaylistsJson from './data/playlists.json';
import localVideosJson from './data/videos.json';
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
  const { user, firebaseUser, isGuest, enableGuestMode, loading, setExamPreference, updatePreferences } = useAuth();

  const [guestBypassed, setGuestBypassed] = useState(() => {
    try {
      return sessionStorage.getItem('biovised_guest_bypassed') === 'true';
    } catch {
      return false;
    }
  });

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
  const [searchSubTab, setSearchSubTab] = useState<'all' | 'lecture' | 'teacher' | 'playlist' | 'batch' | 'test' | 'institute'>('all');
  
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
    try {
      const stored = localStorage.getItem(`biovised_notifications_${user.uid}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        const welcomeNotifs: AppNotification[] = [
          {
            id: 'welcome_notif',
            userId: user.uid,
            title: 'Welcome to Biovised!',
            message: 'You have entered our premium visual stream environment. Explore verified, high-yield JEE & NEET ecosystem materials.',
            read: false,
            createdAt: new Date().toISOString(),
            type: 'system'
          }
        ];
        setNotifications(welcomeNotifs);
        localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(welcomeNotifs));
      }
    } catch {
      setNotifications([]);
    }
  }, [user]);

  // Handle slide-off gesture dismiss
  const handleNotificationDismiss = async (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      if (user) {
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
    try { await deleteNotification(notificationId); } catch {}
  };

  // Mark all notifications as read inside the dashboard
  const handleMarkAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) {
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
    try { await Promise.all(unread.map(n => markNotificationAsRead(n.id))); } catch {}
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
  const [isLabourIllusionActive, setIsLabourIllusionActive] = useState(false);
  const [labourStatusMessage, setLabourStatusMessage] = useState('');
  const [labourProgress, setLabourProgress] = useState(0);
  const [searchedExternal, setSearchedExternal] = useState(false);
  const [externalCount, setExternalCount] = useState(0);

  // CUSTOM SEARCH COMPLIANT STATES (Searches ONLY your local Firestore /videos collection)
  const [vidSearchSubject, setVidSearchSubject] = useState<string>('All');
  const [vidSearchChannel, setVidSearchChannel] = useState<string>('All');
  const [vidSearchDuration, setVidSearchDuration] = useState<string>('All');
  const [firestoreVideos, setFirestoreVideos] = useState<YouTubeVideo[]>([]);
  const [isSyncingVideos, setIsSyncingVideos] = useState<boolean>(false);

  // STRICT VARIABLE NAME PRESERVATION
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [oneShotVideos, setOneShotVideos] = useState<Lecture[]>([]);
  const [videos, setVideos] = useState<Lecture[]>([]);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examFilter, setExamFilter] = useState<string>('NEET');
  const [contentTypeFilter, setContentTypeFilter] = useState<'All' | 'lecture' | 'oneshot'>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'trustScore' | 'popularity'>('trustScore');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const getCuratedFallback = () => {
    const exam = examFilter || 'NEET';
    if (exam === 'JEE') {
      return [
        'JEE mains physics full one shot',
        'jee coordinate geometry lectures',
        'maths mock test mathongo',
        'jee advanced calculus pyqs',
        'physics hc verma solution review'
      ];
    } else {
      return [
        'NEET inorganic chemistry one shot',
        'biology complete mock test series',
        'neet organic chemistry revision',
        'physics mechanics questions',
        'aakash minor cheat sheets biology'
      ];
    }
  };

  // PHASE 5: Server-side search API integration
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setServerSearchResults([]);
      setSearchSuggestions([]);
      setSearchedExternal(false);
      setExternalCount(0);
      setIsLabourIllusionActive(false);
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

    let illusionTimers: NodeJS.Timeout[] = [];

    // Debounced search result query with parameters (implementing Sequence 1-5 from requirement 5.1)
    const timeoutId = setTimeout(() => {
      setIsSearchingServer(true);
      setIsLabourIllusionActive(true);
      setLabourProgress(10);
      setLabourStatusMessage("Querying NEET/JEE indexed catalog databases...");

      let finalResults: any[] = [];
      let extSearched = false;
      let extCount = 0;

      // Start the simulated labour stages (1-2s total illusion)
      const steps = [
        { delay: 300, progress: 35, msg: "Auditing direct Firebase security rules and connections..." },
        { delay: 650, progress: 65, msg: "Analyzing verified teacher credentials & authority ratings..." },
        { delay: 1000, progress: 90, msg: "Mapping matching content playlist records..." },
        { delay: 1350, progress: 100, msg: "Resolving verified content feed matching..." }
      ];

      steps.forEach(step => {
        const t = setTimeout(() => {
          setLabourProgress(step.progress);
          setLabourStatusMessage(step.msg);
          if (step.progress === 100) {
            // Releasing the buffered results to the visual state
            setIsLabourIllusionActive(false);
            setServerSearchResults(finalResults);
            setSearchedExternal(extSearched);
            setExternalCount(extCount);
          }
        }, step.delay);
        illusionTimers.push(t);
      });

      fetch(`/api/search/global?q=${encodeURIComponent(searchQuery)}&examType=${examFilter}&subject=${subjectFilter}&contentType=${contentTypeFilter}&activeTab=${activeExploreTab || 'home'}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'ok') {
            finalResults = data.results || [];
            extSearched = data.searchedExternal || false;
            extCount = data.externalCount || 0;
          }
        })
        .catch(err => console.error('[Global Search Sync Failed]:', err))
        .finally(() => {
          setIsSearchingServer(false);
        });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      illusionTimers.forEach(clearTimeout);
    };
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
    const loadPlatformData = async () => {
      try {
        setIsInitialLoading(true);

        // Fetch parallel resources from Supabase with native catch/handlers
        const [
          { data: dbTeachers, error: errTeachers },
          { data: dbPlaylists, error: errPlaylists },
          { data: dbVideos, error: errVideos },
          { data: dbTestSeries, error: errTestSeries }
        ] = await Promise.all([
          supabase.from('teachers').select('*'),
          supabase.from('playlists').select('*'),
          supabase.from('videos').select('*'),
          supabase.from('test_series').select('*')
        ]);

        const isApiKeyError = 
          (errTeachers && errTeachers.message?.includes('Invalid API key')) ||
          (errPlaylists && errPlaylists.message?.includes('Invalid API key')) ||
          (errVideos && errVideos.message?.includes('Invalid API key')) ||
          (errTestSeries && errTestSeries.message?.includes('Invalid API key'));

        if (!isApiKeyError) {
          if (errTeachers) console.warn('[Supabase Teachers Fetch Error]:', errTeachers);
          if (errPlaylists) console.warn('[Supabase Playlists Fetch Error]:', errPlaylists);
          if (errVideos) console.warn('[Supabase Videos Fetch Error]:', errVideos);
          if (errTestSeries) console.warn('[Supabase TestSeries Fetch Error]:', errTestSeries);
        }

        // Fetch auxiliary legacy models (institutes, batches) from existing service helpers
        let auxiliaryInstitutes: InstituteProfile[] = [];
        let auxiliaryBatches: Batch[] = [];
        try {
          auxiliaryInstitutes = await fetchInstitutes().catch(() => []);
          auxiliaryBatches = await fetchBatches().catch(() => []);
        } catch (auxErr) {
          console.warn('[Auxiliary Services Resolution Error]:', auxErr);
        }

        // 1. Process & Map Teachers (Applying camelCase maps & optional chaining audit)
        const rawTeachers = dbTeachers && dbTeachers.length > 0 ? dbTeachers : (localMasterImport?.teachers || []);
        const sanitizedTeachers = rawTeachers.map((t: any) => ({
          id: t?.id,
          name: t?.name || '',
          avatar: t?.avatar || '',
          subject: t?.subject || '',
          subjects: t?.subjects || [t?.subject].filter(Boolean) || [],
          rating: t?.rating || 4.5,
          accuracy: t?.accuracy || 90,
          videoCount: t?.videoCount || t?.video_count || 0,
          followersCount: t?.followersCount || t?.followers_count || 0,
          bio: t?.bio || '',
          exams: t?.exams || ['JEE', 'NEET'],
          isVerified: t?.isVerified ?? t?.is_verified ?? true,
          createdAt: t?.createdAt || t?.created_at || new Date().toISOString()
        }));
        setTeachers(sanitizedTeachers);

        // 2. Process & Map Playlists
        const rawPlaylists = dbPlaylists && dbPlaylists.length > 0 ? dbPlaylists : (localPlaylistsJson || []);
        const sanitizedPlaylists = rawPlaylists.map((p: any) => {
          const matchedTeacher = sanitizedTeachers.find((t: any) => t.id === p.teacher_id || t.id === p.teacherId);
          return {
            id: p?.id,
            title: p?.title || '',
            category: p?.category || p?.subject || '',
            thumbnail: p?.thumbnail || p?.thumbnail_url || '',
            thumbnailUrl: p?.thumbnailUrl || p?.thumbnail || p?.thumbnail_url || '',
            description: p?.description || '',
            teacherId: p?.teacher_id || p?.teacherId || '',
            teacherName: p?.teacherName || matchedTeacher?.name || '',
            subject: p?.subject || p?.category || '',
            lecturesCount: p?.lecturesCount || p?.lectures_count || p?.videoCount || p?.video_count || p?.video_count || 0,
            examType: p?.examType || 'Both',
            examTags: p?.examTags || p?.exam_tags || ['JEE', 'NEET'],
            createdAt: p?.createdAt || p?.created_at || new Date().toISOString()
          };
        });
        setPlaylists(sanitizedPlaylists);

        // 3. Process & Map Videos
        const rawVideos = dbVideos && dbVideos.length > 0 ? dbVideos : (localVideosJson || []);
        const sanitizedVideos = rawVideos.map((v: any) => {
          const matchedPlaylist = sanitizedPlaylists.find((p: any) => p.id === v.playlist_id || p.id === v.playlistId);
          const matchedTeacher = sanitizedTeachers.find((t: any) => t.id === (v.teacher_id || v.teacherId || matchedPlaylist?.teacherId));
          return {
            id: v?.id,
            title: v?.title || '',
            videoUrl: v?.videoUrl || v?.video_url || '',
            duration: v?.duration || '',
            category: v?.category || 'lecture',
            playlistId: v?.playlist_id || v?.playlistId || '',
            playlist_id: v?.playlist_id || v?.playlistId || '',
            viewsCount: v?.views || v?.viewsCount || v?.views_count || 0,
            likesCount: v?.likesCount || v?.likes_count || 0,
            thumbnailUrl: v?.thumbnailUrl || matchedPlaylist?.thumbnailUrl || '',
            subject: v?.subject || matchedPlaylist?.subject || '',
            examType: v?.examType || matchedPlaylist?.examType || 'Both',
            contentType: v?.contentType || v?.category || 'lecture',
            teacherId: v?.teacherId || v?.teacherId || matchedPlaylist?.teacherId || '',
            teacherName: v?.teacherName || matchedTeacher?.name || '',
            createdAt: v?.createdAt || v?.created_at || new Date().toISOString()
          };
        });
        setVideos(sanitizedVideos);
        setLectures(sanitizedVideos);
        setFirestoreVideos(sanitizedVideos);

        // 4. Process & Map Test Series
        const rawTestSeries = dbTestSeries && dbTestSeries.length > 0 ? dbTestSeries : (localMasterImport?.test_series || []);
        const sanitizedTestSeries = rawTestSeries.map((ts: any) => ({
          id: ts?.id,
          title: ts?.title || ts?.name || '',
          totalTests: ts?.totalTests || ts?.total_tests || 20,
          category: ts?.category || 'NEET',
          price: ts?.price || 1499
        }));
        setTestSeries(sanitizedTestSeries);

        // 5. Build and set OneShotVideos filter array
        const oneshots = sanitizedVideos.filter((v: any) => v.contentType === 'oneshot' || v.category === 'oneshot');
        setOneShotVideos(oneshots);

        // 6. Set auxiliary structures
        if (auxiliaryInstitutes && auxiliaryInstitutes.length > 0) {
          setInstitutes(auxiliaryInstitutes);
        }
        if (auxiliaryBatches && auxiliaryBatches.length > 0) {
          setBatches(auxiliaryBatches);
        }

        // 7. Save mapped state profiles to client local fallback cache
        try {
          localStorage.setItem('biovised_cached_teachers', JSON.stringify(sanitizedTeachers));
          localStorage.setItem('biovised_cached_playlists', JSON.stringify(sanitizedPlaylists));
          localStorage.setItem('biovised_cached_lectures', JSON.stringify(sanitizedVideos));
          if (auxiliaryInstitutes && auxiliaryInstitutes.length > 0) {
            localStorage.setItem('biovised_cached_institutes', JSON.stringify(auxiliaryInstitutes));
          }
          if (auxiliaryBatches && auxiliaryBatches.length > 0) {
            localStorage.setItem('biovised_cached_batches', JSON.stringify(auxiliaryBatches));
          }
        } catch (e) {
          console.warn('[Storage Cache Sync Error]:', e);
        }

      } catch (err) {
        console.warn('Error resolving base datasets from Supabase/Firestore:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadPlatformData();
  }, [localMasterImport, localPlaylistsJson, localVideosJson]);

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
      
      const newNotif: AppNotification = {
        id: `follow_${t.id}_${Date.now()}`,
        userId: user.uid,
        title: "New Educator Followed",
        message: `You have successfully subscribed to ${t.name}. Direct stream-alert triggers are active!`,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'follow'
      };
      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
        return updated;
      });

      try {
        await addRealNotification(
          "New Educator Followed",
          `You have successfully subscribed to ${t.name}. Direct stream-alert triggers are active!`,
          'follow'
        );
      } catch (err) {
        console.warn("Could not save cloud notification:", err);
      }
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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans selection:bg-white selection:text-black animate-fade-in">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center text-center px-4"
        >
          <h1 className="text-white text-4xl sm:text-6xl font-bold tracking-tight font-sans select-none">
            BioVised
          </h1>
          <p className="text-zinc-500 text-[10px] sm:text-xs tracking-widest uppercase mt-4 font-mono">
            JEE & NEET Discovery Platform
          </p>
          <div className="w-48 h-0.5 bg-zinc-900 rounded-full overflow-hidden mt-6 relative">
            <div className="absolute top-0 bottom-0 left-0 w-2/5 bg-white rounded-full animate-progress-slide" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Gate check: If user is not authenticated and has not chosen guest mode yet, force them to land on the login page
  if (!loading && !firebaseUser && !guestBypassed) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        isLandingPage={true}
        onGuestBypass={() => {
          try {
            sessionStorage.setItem('biovised_guest_bypassed', 'true');
          } catch {}
          setGuestBypassed(true);
        }}
      />
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
            <span className="text-[10px] font-mono text-white uppercase tracking-wider">Syncing Lecture Nodes via YouTube API</span>
          </div>
          <div className="w-32 h-[1px] bg-neutral-900 relative overflow-hidden rounded-full mt-2">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 top-0 bottom-0 w-12 bg-white rounded-full"
            />
          </div>
        </div>
      )}

      {/* Fixed top Header segment */}
      {currentView !== 'search' && (
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
          onLogoClick={() => {
            setSearchQuery('');
            setCurrentView('explore');
            setActiveExploreTab('home');
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
      )}

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
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
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
                  className="text-[10px] font-mono font-bold text-[#EEEEEE] hover:underline uppercase cursor-pointer"
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
            <div className="w-full min-h-screen bg-black text-white flex flex-col font-sans -mt-4">
              {/* Premium Minimal Centered Search Header */}
              <div className="sticky top-0 z-50 w-full bg-[#070708]/98 backdrop-blur-md border-b border-[#161619] py-4 px-4 flex items-center justify-center shrink-0 animate-in fade-in duration-200">
                {/* Fixed Clean, Premium Sized Searchbar */}
                <div className="w-full max-w-lg relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lessons, chapters & educators..."
                    className="w-full h-11 bg-[#121214] hover:bg-[#151518] border border-[#212124] focus:border-zinc-600 rounded-full pl-11 pr-24 text-xs font-sans text-white placeholder-zinc-550 outline-none transition-all shadow-inner"
                    autoFocus
                  />
                  
                  {/* Integrated inside-searchbar controls */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {/* Voice search button */}
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Search with Voice"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                    {/* Clean close/exit search button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentView('explore');
                        setActiveExploreTab('home');
                      }}
                      className="p-1.5 bg-zinc-800/60 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-full transition-colors cursor-pointer"
                      title="Exit Search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggestions / Results Scroll Area */}
              <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 space-y-6 text-left pb-32 flex-1">
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

                {searchQuery.trim() === '' ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-300">
                    <div className="w-12 h-12 bg-zinc-900/40 rounded-full flex items-center justify-center mb-4 border border-zinc-900/60">
                      <Search className="w-4.5 h-4.5 text-zinc-500" />
                    </div>
                    <p className="text-xs text-zinc-500 font-sans tracking-wide">
                      Search lessons, chapters & educators...
                    </p>
                  </div>
              ) : isLabourIllusionActive ? (
                /* High-fidelity Emil Kowalski Style Search Labour Illusion Component */
                <div className="py-12 px-6 bg-brand-dark/40 border border-brand-border/40 rounded-2xl flex flex-col items-center justify-center gap-6 text-center shadow-xl backdrop-blur-md max-w-2xl mx-auto my-8 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-brand-accent/20 via-brand-accent to-brand-accent/20 w-full animate-pulse" />
                  
                  {/* Outer circle spinner */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-16 h-16 text-zinc-800 animate-spin" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray="30 20" />
                    </svg>
                    <div className="absolute w-12 h-12 rounded-full border border-brand-accent/30 flex items-center justify-center">
                      <Search className="w-5 h-5 text-brand-accent animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2 select-none w-full max-w-md">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1 px-1">
                      <span>Analyzing Vault</span>
                      <span className="text-brand-accent font-bold">{labourProgress}%</span>
                    </div>
                    {/* Modern high-contrast progress bar */}
                    <div className="h-1.5 w-full bg-brand-black rounded-full overflow-hidden border border-brand-border/30">
                      <div 
                        className="h-full bg-brand-accent rounded-full transition-all duration-300"
                        style={{ width: `${labourProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 w-full max-w-md">
                    <p className="text-xs font-mono text-brand-accent font-medium uppercase tracking-wide min-h-[1.5rem] animate-pulse">
                      {labourStatusMessage}
                    </p>
                    <p className="text-[10px] font-sans text-brand-gray/80 leading-relaxed max-w-xs mx-auto">
                      Sorting credentials, calculating content trust index and applying NEET/JEE filters...
                    </p>
                  </div>

                  {/* Aesthetic grid indicating activity */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-3 pt-3 border-t border-[#1E1E24] text-[9px] font-mono text-zinc-500 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Security: Rules Validated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent" />
                      <span>Index: Firestore Live</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>Target: {examFilter}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-650" />
                      <span>Status: Multi-layered Verified</span>
                    </div>
                  </div>
                </div>
              ) : (() => {
                // Determine layout lists based on sub-tab
                const showLectures = searchSubTab === 'all' || searchSubTab === 'lecture';
                const showTeachers = searchSubTab === 'all' || searchSubTab === 'teacher';
                const showPlaylists = searchSubTab === 'all' || searchSubTab === 'playlist';
                const showBatches = searchSubTab === 'all' || searchSubTab === 'batch';
                const showTests = searchSubTab === 'all' || searchSubTab === 'test';
                const showInstitutes = searchSubTab === 'all' || searchSubTab === 'institute';

                // Count total visible categories in "All" view with > 0 results
                const countActive = 
                  (filteredLectures.length > 0 ? 1 : 0) +
                  (filteredTeachers.length > 0 ? 1 : 0) +
                  (filteredPlaylists.length > 0 ? 1 : 0) +
                  (filteredBatches.length > 0 ? 1 : 0) +
                  (filteredTestSeries.length > 0 ? 1 : 0) +
                  (filteredInstitutes.length > 0 ? 1 : 0);

                if (countActive === 0) {
                  return (
                    <div className="text-center py-20 bg-[#070708] border border-zinc-900 rounded-3xl p-8 max-w-md mx-auto my-8 shadow-2xl animate-in fade-in duration-300">
                      <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-850">
                        <Search className="w-6 h-6 text-zinc-500" />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">No Matches Found</h3>
                      <p className="text-sm text-zinc-400 font-sans leading-relaxed">
                        Can't find keyword related to this, try again.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* YouTube-Style Horizontal Category Pill Filtering */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar border-b border-zinc-900/60">
                      {[
                        { id: 'all', label: 'All Results' },
                        { id: 'lecture', label: `Lectures (${filteredLectures.length})` },
                        { id: 'playlist', label: `Playlists (${filteredPlaylists.length})` },
                        { id: 'teacher', label: `Educators (${filteredTeachers.length})` },
                        { id: 'batch', label: `Batches (${filteredBatches.length})` },
                        { id: 'test', label: `Mock Tests (${filteredTestSeries.length})` },
                        { id: 'institute', label: `Institutes (${filteredInstitutes.length})` },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setSearchSubTab(tab.id as any)}
                          className={`px-4 py-1.5 rounded-full text-[11px] font-sans font-medium select-none whitespace-nowrap border transition-all cursor-pointer ${
                            searchSubTab === tab.id
                              ? 'bg-white text-black border-white'
                              : 'bg-[#0E0E0E] hover:bg-[#151515] border-zinc-850 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Results Displayed (Strictly Personalize To Chosen Exam and Active Category Tab) */}
                    <div className="space-y-8 pt-2">
                      
                      {/* 1. Lectures Results */}
                      {showLectures && (searchSubTab !== 'all' || filteredLectures.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Video Lectures</h4>
                          {filteredLectures.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No matching video lectures available for your query.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                              {filteredLectures.map(lec => {
                                const formattedSub = "182K";
                                const lectureDto = {
                                  ...lec,
                                  channel: {
                                    id: lec.teacherId || 'unknown',
                                    name: lec.teacherName || 'Verified Educator',
                                    avatarUrl: null,
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
                      {showTeachers && (searchSubTab !== 'all' || filteredTeachers.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Educators & Gurus</h4>
                          {filteredTeachers.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No educators found matching your query.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {filteredTeachers.map(t => (
                                <div key={t.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex gap-4 text-left items-center">
                                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-800 animate-in fade-in duration-300" />
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
                      {showPlaylists && (searchSubTab !== 'all' || filteredPlaylists.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Curated Subject Playlists</h4>
                          {filteredPlaylists.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No curated playlists matched your query.</p>
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
                      {showBatches && (searchSubTab !== 'all' || filteredBatches.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Live Student Cohorts</h4>
                          {filteredBatches.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No live cohorts matched your query.</p>
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
                      {showTests && (searchSubTab !== 'all' || filteredTestSeries.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Mock Practice Test Series</h4>
                          {filteredTestSeries.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No mock test series available matching your search.</p>
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
                      {showInstitutes && (searchSubTab !== 'all' || filteredInstitutes.length > 0) && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-mono tracking-widest text-zinc-550 uppercase">Academic Institutes & Portals</h4>
                          {filteredInstitutes.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 font-mono p-4 rounded-xl bg-[#0A0A0A] border border-[#131415]">No matched affiliated centers found.</p>
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

                      {/* Safe Fallback: No active sections returned any records in "All Results" */}
                      {searchSubTab === 'all' && countActive === 0 && (
                        <div className="text-center py-16 bg-[#09090A] border border-zinc-900/80 rounded-2xl p-6">
                          <p className="text-xs text-zinc-400 font-sans max-w-sm mx-auto leading-relaxed">
                            No indexed directory entries matched <span className="text-white font-bold">"{searchQuery}"</span>. Please double-check your spelling, adjust filters, or browse other categories.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          ) : currentView === 'profile' && user ? (
            <ProfileDashboard
              onSelectLecture={(lec) => {
                setActiveLecture(lec);
                setCurrentView('explore');
              }}
              onOpenTeacher={(teacherId) => setDetailModal({ id: teacherId, type: 'teacher' })}
              activeLecture={activeLecture}
              onLogoutSuccess={() => setCurrentView('explore')}
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
                        Scanning verified Firestore <span className="text-white font-semibold">videos</span> catalog for <span className="text-white font-bold">"{searchQuery}"</span>
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
                        className="w-full bg-[#111113] border border-neutral-800 rounded-xl text-xs text-white p-2.5 outline-none focus:border-zinc-500"
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
                        className="w-full bg-[#111113] border border-neutral-800 rounded-xl text-xs text-white p-2.5 outline-none focus:border-zinc-500"
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
                                ? 'bg-white/10 text-white border border-white/20'
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
                                        <span className="text-[8px] font-mono font-black uppercase bg-[#EEEEEE] text-black border border-[#EEEEEE] px-2 py-0.5 rounded">
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
                              avatarUrl: null,
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
                                    <span className="text-[9px] font-mono font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded leading-none block">No Data</span>
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
                              starClassName="text-[#FFEFD5] font-sans flex items-center gap-1"
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

              {/* Exact Mock Screenshot Match Footer Navigation Bar (Hidden when activeLecture is playing or in search view to block distraction) */}
              {!activeLecture && currentView !== 'search' && (
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#060606]/98 border-t border-[#121212]/95 shadow-2xl h-[58px] xs:h-[72px] px-1 xs:px-4 md:px-8 flex justify-around items-center backdrop-blur-md select-none">
                <div className="flex justify-around items-center w-full max-w-5xl mx-auto h-full gap-0.5 xs:gap-1.5 flex-nowrap overflow-hidden">
                  {[
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'teachers', label: 'Teachers', icon: Users },
                    { id: 'playlists', label: 'Playlist', icon: PlaySquare },
                    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
                    { id: 'batches', label: 'One Shot', icon: Layers },
                    { id: 'lecture', label: 'Lecture', icon: Video },
                    { id: 'institutes', label: 'Institutes', icon: Building2 }
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
