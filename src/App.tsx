import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import VideoPlayer from './components/VideoPlayer';
import DetailsModal from './components/DetailsModal';
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
import { db } from './firebase';
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
import { TeacherProfile, InstituteProfile, Lecture, Playlist, Batch, AppNotification } from './types';
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
  Clock
} from 'lucide-react';
import { getPlaylistThumbnail, getLectureThumbnail } from './services/thumbnailHelper';

function AppContent() {
  const { user, isGuest, enableGuestMode, loading, setExamPreference, updatePreferences } = useAuth();

  // Control splash screen layers (shows on initial session load)
  const [showSplash, setShowSplash] = useState(true);

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

  // Database loaded sets with instantaneous offline/cache state recovery
  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => {
    try {
      const cached = localStorage.getItem('biovised_cached_teachers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [institutes, setInstitutes] = useState<InstituteProfile[]>(() => {
    try {
      const cached = localStorage.getItem('biovised_cached_institutes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [lectures, setLectures] = useState<Lecture[]>(() => {
    try {
      const cached = localStorage.getItem('biovised_cached_lectures');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const cached = localStorage.getItem('biovised_cached_playlists');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [batches, setBatches] = useState<Batch[]>(() => {
    try {
      const cached = localStorage.getItem('biovised_cached_batches');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);

  // Real-time notifications state & syncing hook
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) {
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

  // Dynamic search / filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [searchedExternal, setSearchedExternal] = useState(false);
  const [externalCount, setExternalCount] = useState(0);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examFilter, setExamFilter] = useState<string>(() => localStorage.getItem('biovised_onboarding_exam') || 'All');
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
    fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
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

  // Trigger splash screen timer & force redirect on finish
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setCurrentView('explore');
        setActiveExploreTab('home');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Sync exam preferences when logged in
  useEffect(() => {
    if (user && user.examType && user.examType !== 'Both') {
      localStorage.setItem('biovised_onboarding_exam', user.examType);
      setExamFilter(user.examType);
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
    fetchTeachers().then(data => {
      setTeachers(data);
      try { localStorage.setItem('biovised_cached_teachers', JSON.stringify(data)); } catch (e) { console.warn(e); }
    });
    fetchInstitutes().then(data => {
      setInstitutes(data);
      try { localStorage.setItem('biovised_cached_institutes', JSON.stringify(data)); } catch (e) { console.warn(e); }
    });
    fetchLectures().then(data => {
      setLectures(data);
      try { localStorage.setItem('biovised_cached_lectures', JSON.stringify(data)); } catch (e) { console.warn(e); }
    });
    fetchPlaylists().then(data => {
      setPlaylists(data);
      try { localStorage.setItem('biovised_cached_playlists', JSON.stringify(data)); } catch (e) { console.warn(e); }
    });
    fetchBatches().then(data => {
      setBatches(data);
      try { localStorage.setItem('biovised_cached_batches', JSON.stringify(data)); } catch (e) { console.warn(e); }
    });
  }, []);

  // Sync user following list and handle guest mode transition
  useEffect(() => {
    if (user) {
      fetchFollowingList().then(ids => setFollowedIds(ids));
    } else if (!isGuest && !loading) {
      // Prompt auth or enable guest mode by default to ensure explore state
      enableGuestMode();
    }
  }, [user, isGuest, loading]);

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
  const searchActive = searchQuery.trim() !== '';

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

  const filteredTestSeries: any[] = [];

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

  // Intercept and open notifications view in absolute clean full screen with zero outer margin layouts
  if (currentView === 'notifications') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
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
        {/* Active review portals */}
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
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

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
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {}}
        onViewDashboard={setCurrentView}
        currentView={currentView}
        searchVal={searchQuery}
        activeExploreTab={activeExploreTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        notifications={notifications}
      />

      <main className="flex-1 pb-32">
          
          {/* Main conditional views manager */}
          {currentView === 'search' ? (
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-left pb-24 min-h-[80vh]">
              {/* Immersive Navigation Bar without redundant search box */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackNavigation}
                    className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer shrink-0 animate-pulse"
                    title="Back to Discovery Hub"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                       All-Category Global Search
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5 leading-none">
                      {searchQuery ? `Displaying global registry tags containing: "${searchQuery}"` : 'Type in the top header bar to query lessons, badges & educators'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSpecsModalOpen(true)}
                  className="px-4 py-1.5 bg-[#0F0F0F] hover:bg-zinc-900 border border-[#1F1F1F] rounded-full text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
                  title="Search Filters / Specifications"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-350" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Specification chips */}
              {(subjectFilter !== 'All' || examFilter !== 'All' || contentTypeFilter !== 'All') && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
                  <span>ACTIVE FILTERS:</span>
                  {subjectFilter !== 'All' && (
                    <span className="text-[10px] bg-zinc-900 border border-[#222] px-2.5 py-0.5 rounded text-white flex items-center gap-1">
                      Subject: {subjectFilter}
                      <button onClick={() => setSubjectFilter('All')} className="hover:text-rose-400 ml-1">×</button>
                    </span>
                  )}
                  {examFilter !== 'All' && (
                    <span className="text-[10px] bg-zinc-900 border border-[#222] px-2.5 py-0.5 rounded text-white">
                      Exam Category: {examFilter}
                    </span>
                  )}
                  {contentTypeFilter !== 'All' && (
                    <span className="text-[10px] bg-zinc-900 border border-[#222] px-2.5 py-0.5 rounded text-white flex items-center gap-1">
                      Format: {contentTypeFilter}
                      <button onClick={() => setContentTypeFilter('All')} className="hover:text-rose-400 ml-1">×</button>
                    </span>
                  )}
                </div>
              )}

              {/* Autocomplete Suggestions from Dynamic Index */}
              {searchSuggestions.length > 0 && searchQuery.trim() !== '' && (
                <div className="bg-[#0B0B0B] border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Suggestions matched of live index:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {searchSuggestions.slice(0, 5).map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          // record search query in history if we wanted to
                          const now = Date.now();
                          setSearchHistory(prev => {
                            const without = prev.filter(x => x.query.toLowerCase() !== suggestion.toLowerCase());
                            const updated = [{ query: suggestion, ts: now }, ...without].slice(0, 10);
                            localStorage.setItem('biovised_search_history_v2', JSON.stringify(updated));
                            return updated;
                          });
                        }}
                        className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[#FF5A1F] px-3 py-1 rounded-full cursor-pointer transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Realtime Search Multi-Step Logging Banner */}
              {searchQuery.trim() !== '' && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0A]/40 border border-[#141414] rounded-xl px-4 py-2.5 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSearchingServer ? 'bg-amber-400' : 'bg-green-400'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isSearchingServer ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                    </span>
                    <span className="text-zinc-400 uppercase">
                      {isSearchingServer 
                        ? 'Search engine scanning index registers...'
                        : 'Verified index query complete'
                      }
                    </span>
                  </div>

                  {searchedExternal && (
                    <div className="text-amber-500 uppercase flex items-center gap-1">
                      <span>• Step 3/4 Direct YouTube fallback triggered</span>
                      <span className="bg-amber-950/50 text-amber-500 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                        Pending Verification
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state -> Genuine Search History (Past 15 days) */}
              {searchQuery.trim() === '' ? (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Recent Search History
                    </h3>
                    {searchHistory.length > 0 && (
                      <button
                        onClick={() => {
                          localStorage.removeItem('biovised_search_history_v2');
                          setSearchHistory([]);
                        }}
                        className="text-[10px] text-zinc-505 hover:text-white uppercase font-mono font-bold hover:underline cursor-pointer"
                      >
                        Clear All History
                      </button>
                    )}
                  </div>

                  {searchHistory.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 font-mono text-xs space-y-1 bg-[#0A0A0A] rounded-2xl border border-[#141414]">
                      <p className="font-bold text-zinc-400">YOUR HISTORY IS EMPTY</p>
                      <p className="text-[11px] text-zinc-600 max-w-sm mx-auto leading-relaxed mt-1">Previous searches will be securely cached here for 15 days focus tracking.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2.5 px-3.5 hover:bg-zinc-905 rounded-xl group transition-all"
                        >
                          <button
                            onClick={() => {
                              setSearchQuery(item.query);
                              recordSearchQuery(item.query);
                            }}
                            className="flex-1 flex items-center gap-3 text-xs text-zinc-350 hover:text-white font-mono text-left cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                            <span>{item.query}</span>
                          </button>
                          <button
                            onClick={() => deleteSearchQuery(item.query)}
                            className="p-1 text-zinc-550 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Remove from history"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredLectures.map(lec => (
                              <div
                                key={lec.id}
                                className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all flex text-left p-3.5 gap-4"
                              >
                                <div className="relative aspect-video w-28 sm:w-32 shrink-0 overflow-hidden rounded-lg bg-black border border-neutral-950">
                                  <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => {
                                      recordSearchQuery(searchQuery);
                                      setActiveLecture(lec);
                                      setCurrentView('explore');
                                    }}
                                    className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white text-black flex items-center justify-center cursor-pointer shadow hover:scale-105 transition-transform"
                                  >
                                    <Play className="w-4 h-4 fill-black pl-0.5" />
                                  </button>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="text-xs font-bold text-white uppercase truncate tracking-tight flex-1">{lec.title}</h5>
                                      {lec.verificationStatus === 'pending' && (
                                        <span className="bg-orange-950 text-orange-400 border border-orange-500/30 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase leading-none scale-90 shrink-0">
                                          Unverified Source
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-mono">By {lec.teacherName}</p>
                                    {(lec as any).recommendationReason && (
                                      <div className="text-[9px] text-[#A855F7] font-mono bg-[#A855F7]/5 border border-[#A855F7]/15 px-2 py-0.5 rounded-lg inline-block max-w-full">
                                        ✨ {(lec as any).recommendationReason}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] font-mono mt-1">
                                    <span className="text-zinc-500">{lec.viewsCount?.toLocaleString()} Views</span>
                                    {user && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const hidden = user.hiddenContent || [];
                                          updatePreferences({
                                            hiddenContent: [...hidden, lec.id]
                                          }).catch(err => console.warn('Could not hide recommendation:', err));
                                        }}
                                        title="Hide content"
                                        className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-neutral-900 transition-colors cursor-pointer"
                                      >
                                        <EyeOff className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
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
                              <div key={b.id} className="bg-[#0D0D0D] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between text-left gap-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-350 px-2 py-0.5 rounded uppercase">{b.examType}</span>
                                    <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">● Live</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-white uppercase tracking-tight truncate">{b.name}</h5>
                                  <p className="text-[10px] text-zinc-400 line-clamp-1">{b.description}</p>
                                </div>
                                <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <span>Price: ₹{b.price?.toLocaleString()}</span>
                                  <span className="text-white px-2 py-0.5 bg-zinc-90 w-fit rounded">{b.discountCode}</span>
                                </div>
                              </div>
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
                                    <span className="text-[10px] font-mono text-white/50">{ts.subject}</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-white uppercase truncate tracking-tight">{ts.name}</h5>
                                  <p className="text-[10px] text-zinc-405 line-clamp-1">{ts.description}</p>
                                </div>
                                <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <span>Questions: {ts.questionsCount}</span>
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
          ) : (
            // Explore View (Main Discovery Screen)
            <>
              {activeLecture ? (
                /* Dedicated Video Player View (Plays in its own clean page to prevent design collapse) */
                <div className="min-h-[80vh] flex flex-col pb-24 text-left">
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
              {searchQuery !== '' ? (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24 text-left">
                  {/* Search Results Summary Header */}
                  <div className="bg-[#111111] rounded-2xl p-6 border border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🔍 Unified Search Results</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono font-medium">
                        Matching keyword <span className="text-white font-semibold">"{searchQuery}"              </span> across resources
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Specifications filter indicators */}
                      {(subjectFilter !== 'All' || examFilter !== 'All' || contentTypeFilter !== 'All') && (
                        <span className="text-[9px] font-mono uppercase bg-[#161616] px-2.5 py-1 text-zinc-400 border border-[#222] rounded-lg">
                          ✓ ACTIVE SPECIFICATIONS: {subjectFilter !== 'All' && `${subjectFilter}`} {examFilter !== 'All' && `${examFilter}`} {contentTypeFilter !== 'All' && `${contentTypeFilter}`}
                        </span>
                      )}
                      
                      <button
                        onClick={() => setSpecsModalOpen(true)}
                        className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <Filter className="w-3.5 h-3.5 text-black" strokeWidth={2.5} /> Specify Parameters
                      </button>

                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-1.5 bg-zinc-900 text-zinc-300 hover:text-white border border-[#222] hover:border-zinc-700 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  {/* 1. Lectures Matching */}
                  <section className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-[#1A1A1A] pb-2 flex items-center gap-2">
                       Matching Video Chapters ({filteredLectures.length})
                    </h4>
                    {filteredLectures.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center font-mono bg-[#0B0B0B] rounded-xl border border-[#1A1A1A]">
                        No lecture chapters matched parameters.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {filteredLectures.map((lec) => (
                          <div
                            key={lec.id}
                            onClick={() => {
                              setActiveLecture(lec);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-[#111111] rounded-xl overflow-hidden hover:bg-[#141414] cursor-pointer border border-[#1A1A1A] hover:border-zinc-700 transition-all p-3 flex gap-3 items-center group text-left"
                          >
                            <div className="relative w-24 aspect-video shrink-0 bg-black rounded overflow-hidden">
                              <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <h5 className="text-xs font-semibold uppercase text-white truncate">{lec.title}</h5>
                                {lec.verificationStatus === 'pending' && (
                                  <span className="bg-orange-950 text-orange-400 border border-orange-500/30 text-[7px] font-mono px-1 rounded uppercase tracking-wider scale-90 shrink-0">
                                    Unverified
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Expert: {lec.teacherName}</p>
                              <span className="text-[8px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-zinc-500 px-1 py-0.2 rounded mt-1.5 inline-block">
                                {lec.exams?.join(', ') || 'General'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* 2. Teachers Matching */}
                  <section className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-[#1A1A1A] pb-2 flex items-center gap-2">
                      Matching Educators ({filteredTeachers.length})
                    </h4>
                    {filteredTeachers.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center font-mono bg-[#0B0B0B] rounded-xl border border-[#1A1A1A]">
                        No educators matched the specifications.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {filteredTeachers.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setDetailModal({ id: t.id, type: 'teacher' })}
                            className="p-3 bg-[#111111] border border-[#1A1A1A] hover:border-zinc-700 rounded-xl flex items-center gap-3 cursor-pointer transition-all text-left"
                          >
                            <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-[#1A1A1A]" />
                            <div className="min-w-0">
                              <h5 className="text-[11.5px] font-bold text-white truncate">{t.name}</h5>
                              <p className="text-[9.5px] text-zinc-400 font-mono mt-0.5 truncate">{t.subject} Specialist</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* 3. Batches Matching */}
                  <section className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-[#1A1A1A] pb-2 flex items-center gap-2">
                      Matching Batches & Cohorts
                    </h4>
                    {batches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.subject.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center font-mono bg-[#0B0B0B] rounded-xl border border-[#1A1A1A]">
                        No batch schedules matched keyword.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {batches
                          .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((b) => (
                            <div
                              key={b.id}
                              className="p-4 bg-[#111111] border border-[#1A1A1A] rounded-xl text-left"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-zinc-400 px-1.5 py-0.5 rounded leading-none">
                                  {b.subject}
                                </span>
                              </div>
                              <h5 className="text-xs font-semibold text-white">{b.name}</h5>
                              <p className="text-[10.5px] text-zinc-450 mt-1 line-clamp-1">{b.description}</p>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                <>
                  {activeExploreTab === 'home' && (
                    <Hero
                      onExploreLectures={() => {
                        setActiveExploreTab('lecture');
                        setContentTypeFilter('oneshot');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onExploreTeachers={() => {
                        setActiveExploreTab('teachers');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
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

                    {filteredLectures.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No video lessons registered matching search parameter bounds.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {filteredLectures.map((lec) => (
                          <div
                            key={lec.id}
                            onClick={() => {
                              setActiveLecture(lec);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-[#111111] rounded-2xl overflow-hidden hover:bg-[#141414] cursor-pointer transition-all flex flex-col justify-between group"
                          >
                            <div className="relative aspect-video bg-black overflow-hidden">
                              <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-10 h-10 text-white fill-current" />
                              </div>
                              <span className="absolute bottom-2.5 right-2.5 text-[8px] font-mono font-bold tracking-wider bg-black/85 px-2 py-0.5 rounded text-white uppercase">
                                {lec.duration}
                              </span>
                            </div>

                            <div className="p-5 space-y-3.5 text-left flex-grow flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                  <span className="text-[8px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                                    {lec.subject}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-bold truncate">
                                    {lec.teacherName}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-white tracking-tight leading-snug line-clamp-2 uppercase flex-1">
                                    {lec.title}
                                  </h4>
                                  {lec.verificationStatus === 'pending' && (
                                    <span className="bg-orange-950 text-orange-400 border border-orange-500/30 text-[7px] font-mono px-1 rounded uppercase tracking-wider scale-90 shrink-0">
                                      Unverified
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-[9px] text-zinc-500 font-mono pt-1 uppercase tracking-wider">
                                Stream views: {lec.viewsCount?.toLocaleString() || '0'}
                              </div>
                            </div>
                          </div>
                        ))}
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

                  {filteredTeachers.length === 0 ? (
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
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-bold">{t.rating || 4.5}</span>
                              </div>
                              <span className="text-zinc-500 uppercase">({t.reviewCount || 0} reviews)</span>
                            </div>

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
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  {/* Playlist Database Header in accordance with Biovised Screenshot format */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2DD4BF] uppercase block">
                      DATABASE
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
                      YouTube Playlists
                    </h2>
                    <span className="text-xs text-zinc-500 font-mono block">
                      {filteredPlaylists.length} playlists
                    </span>
                  </div>



                  {/* Playlists listing */}
                  {filteredPlaylists.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-[#0F0F10] border border-neutral-900">
                      <p className="text-xs text-zinc-500 font-mono">No playlists match the selected subject filter.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {filteredPlaylists.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPlaylist(p)}
                          className="bg-[#0F0F10] hover:bg-[#131314] border border-[#202022] rounded-2xl p-4 flex gap-4 items-center justify-between text-left cursor-pointer transition-all duration-300 hover:border-zinc-700 w-full"
                        >
                          {/* Left: Video / Playlist play icon inside layered card */}
                          <div className="w-32 xs:w-40 sm:w-52 shrink-0 aspect-video bg-[#070708] border border-[#202022] rounded-xl relative group overflow-hidden">
                            {getPlaylistThumbnail(p) ? (
                              <img
                                src={getPlaylistThumbnail(p)}
                                alt={p.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="absolute inset-2 border border-zinc-900 rounded-lg flex items-center justify-center bg-zinc-900">
                                <PlaySquare className="w-5 h-5 text-zinc-650" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                              <div className="bg-[#0C0C0D]/80 p-2 rounded-full border border-neutral-800">
                                <svg
                                  className="w-3.5 h-3.5 text-white group-hover:text-[#2DD4BF] transition-colors"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Right: Content details */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Top row with tags, count, and rating */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Lecture count {p.lecturesCount || "TBD"}
                              </span>
                              <div className="text-[10px] bg-[#0A0A0B] border border-neutral-900 text-zinc-500 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ml-auto">
                                <span className="text-zinc-650 font-sans">★</span> No ratings
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1 uppercase">
                              {p.title}
                            </h4>

                            {/* Subtitle / Instructors */}
                            <p className="text-[11px] sm:text-xs text-[#71717A] font-mono tracking-tight font-medium">
                              {p.teacherName} • {p.instituteName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeExploreTab === 'batches' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-zinc-400" /> REGISTERED LIVE COURSE BATCHES ({filteredBatches.length})
                    </h3>
                  </div>

                  {filteredBatches.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No live student cohorts or batches match the selected criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {filteredBatches.map((b) => (
                        <div key={b.id} className="bg-[#111111] hover:bg-[#141414] rounded-2xl p-6 transition-all text-left flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-350 px-2 py-0.5 rounded uppercase">{b.examType}</span>
                              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">● Live Batch</span>
                            </div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1">{b.name}</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{b.description}</p>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-3 border-t border-[#1C1C1C]">
                            <span>Price: {typeof b.price === 'number' ? (b.price === 0 ? 'Free' : `₹${b.price.toLocaleString()}`) : 'Free'}</span>
                            <span className="text-white font-extrabold bg-zinc-900 border border-[#222] px-2.5 py-0.5 rounded tracking-wide">{b.discountCode || 'VERIFIED'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeExploreTab === 'tests' && (
                <div className="max-w-7xl mx-auto px-4 py-16 pb-24 text-center">
                  <div className="max-w-md mx-auto space-y-6 py-12 bg-[#111111] rounded-3xl border border-[#1C1C1C] px-6">
                    <div className="w-16 h-16 bg-[#161616] rounded-full flex items-center justify-center mx-auto text-zinc-400">
                      <ClipboardCheck className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                        Syllabus-Mapped Test Center
                      </h3>
                      <p className="text-xs text-zinc-405 font-mono leading-relaxed max-w-xs mx-auto">
                        Sectional mock checkpoints, verified test series, and past-year study exams will be activated here soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeExploreTab === 'institutes' && (
                <div className="max-w-7xl mx-auto px-4 py-16 pb-24 text-center">
                  <div className="max-w-md mx-auto space-y-6 py-12 bg-[#111111] rounded-3xl border border-[#1C1C1C] px-6">
                    <div className="w-16 h-16 bg-[#161616] rounded-full flex items-center justify-center mx-auto text-zinc-400">
                      <Building2 className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                        Affiliate Institutes
                      </h3>
                      <p className="text-xs text-zinc-405 font-mono leading-relaxed max-w-xs mx-auto">
                        Premium preparation academies, verified digital learning portals, and structured stream hubs will be added here soon.
                      </p>
                    </div>
                  </div>
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
                    { id: 'playlists', label: 'Playlists', icon: PlaySquare },
                    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
                    { id: 'batches', label: 'Batches', icon: Layers },
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
                          setActiveExploreTab(t.id as any);
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
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
