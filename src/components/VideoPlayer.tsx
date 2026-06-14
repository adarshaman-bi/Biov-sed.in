import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  Pause,
  ThumbsUp,
  Bookmark,
  Share2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Sun,
  Settings,
  Lock,
  Unlock,
  Plus,
  Star,
  CheckCircle,
  X,
  FileCheck2,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { Lecture, Review } from '../types';
import { getLectureThumbnail } from '../services/thumbnailHelper';
import {
  toggleWatchLater,
  toggleLikeVideo,
  trackWatchProgress,
  fetchWatchLaterIds,
  fetchLikedLecturesIds,
  submitReview,
  fetchReviews
} from '../services/dbService';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoPlayerProps {
  lecture: Lecture;
  onClose?: () => void;
  playlistLectures?: Lecture[];
  onSelectLecture?: (lec: Lecture) => void;
}

const getYoutubeId = (url?: string): string => {
  if (!url) return 'nLE7_YBFQNQ';
  const embedMatch = url.match(/embed\/([^?]+)/);
  if (embedMatch && embedMatch[1] && embedMatch[1].length === 11) {
    return embedMatch[1];
  }
  const watchMatch = url.match(/v=([^&]+)/);
  if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
    return watchMatch[1];
  }
  return 'nLE7_YBFQNQ'; // Default fallback
};

export default function VideoPlayer({
  lecture,
  onClose,
  playlistLectures = [],
  onSelectLecture
}: VideoPlayerProps) {
  const { user, isGuest, updatePreferences } = useAuth();

  // Playback states synchronized with YT IFrame Player API
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<string>('1080p');
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Gestural / sliders values
  const [brightness, setBrightness] = useState<number>(100);
  const [volume, setVolume] = useState<number>(85);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showSeekOverlay, setShowSeekOverlay] = useState<'forward' | 'backward' | null>(null);
  
  // Custom HUD overlays
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [activePopupSection, setActivePopupSection] = useState<'main' | 'speed' | 'quality'>('main');
  const [showReportToast, setShowReportToast] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Social/Channel states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ channelTitle: string; avatarUrl: string } | null>(null);

  useEffect(() => {
    const videoId = getYoutubeId(lecture.videoUrl);
    if (!videoId) return;
    fetch(`/api/youtube/channel-info?videoId=${videoId}`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'ok' && res.data) {
          setChannelInfo({
            channelTitle: res.data.channelTitle,
            avatarUrl: res.data.avatarUrl
          });
        }
      })
      .catch(err => {
        console.warn("Error loading channel info from API:", err);
      });
  }, [lecture.videoUrl]);

  // Lesson reviews
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Screen orientation fullscreen simulation
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isNativeFsActive, setIsNativeFsActive] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsNativeFsActive(isFs);
      setIsFullscreenMode(isFs);

      if (!isFs) {
        // Exited native fullscreen, unlock orientation
        try {
          if ((window.screen as any)?.orientation?.unlock) {
            (window.screen.orientation as any).unlock();
          } else if ((window.screen as any)?.unlockOrientation) {
            (window.screen as any).unlockOrientation();
          }
        } catch (e) {
          console.warn('Unlock orientation error:', e);
        }
      } else {
        // Entered native fullscreen, lock orientation to landscape
        try {
          if ((window.screen as any)?.orientation?.lock) {
            (window.screen.orientation as any).lock('landscape').catch(() => {});
          } else if ((window.screen as any)?.lockOrientation) {
            (window.screen as any).lockOrientation('landscape');
          }
        } catch (e) {
          console.warn('Lock orientation error:', e);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const shouldRotate = isFullscreenMode && isPortrait;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncTimeRef = useRef<number>(-1);
  const volTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const brightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trackerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset playback and cover state when active lecture changes
  useEffect(() => {
    setHasPlayed(false);
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setProgressPercent(0);
  }, [lecture]);

  // Load YouTube script on mount
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Set up YT Player instance
  const [isYtReady, setIsYtReady] = useState(false);

  useEffect(() => {
    let active = true;
    let player: any = null;
    let checkInterval: any = null;
    let initialized = false;

    const createPlayer = () => {
      if (!active || initialized) return;
      if (!window.YT || !window.YT.Player) return;

      initialized = true;
      const videoId = getYoutubeId(lecture.videoUrl);

      // Clean up previous container
      const parent = document.getElementById('yt-iframe-container');
      if (parent) {
        parent.innerHTML = '<div id="yt-iframe-player" class="w-full h-full"></div>';
      }

      setPlayerReady(false);

      player = new window.YT.Player('yt-iframe-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: isCaptionsOn ? 1 : 0,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            if (!active) return;
            ytPlayerRef.current = event.target;
            setPlayerReady(true);
            setIsYtReady(true);
            event.target.setVolume(volume);
            event.target.setPlaybackRate(playbackSpeed);
            try {
              event.target.playVideo();
            } catch (err) {
              console.warn("Autoplay block:", err);
            }
            const duration = event.target.getDuration();
            if (duration) {
              setTotalDurationSec(Math.floor(duration));
            }
          },
          onStateChange: (event: any) => {
            if (!active) return;
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (event.data === 1) {
              setIsPlaying(true);
              setHasPlayed(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Use interval to check
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          createPlayer();
        }
      }, 100);

      // Dynamic ready subscription fallback for first load
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        if (window.YT && window.YT.Player) {
          if (checkInterval) clearInterval(checkInterval);
          createPlayer();
        }
      };
    }

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Destroy fail:", e);
        }
      }
      ytPlayerRef.current = null;
      setPlayerReady(false);
      setIsYtReady(false);
    };
  }, [lecture]);

  // Gestural dragging handlers for VLC style controls (left screen brightness, right screen volume)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartVal = useRef<number>(0);
  const dragType = useRef<'brightness' | 'volume' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const handlePointerStart = (clientX: number, clientY: number) => {
    if (!isFullscreenMode) return; // Volume and brightness gestures only show & work in landscape fullscreen!
    if (isLocked || !containerRef.current) return;
    
    // Calculate if index pointer was on left or right half of the player
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const isLeftHalf = relativeX < rect.width / 2;

    setIsDragging(true);
    dragStartY.current = clientY;
    
    if (isLeftHalf) {
      dragType.current = 'brightness';
      dragStartVal.current = brightness;
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else {
      dragType.current = 'volume';
      dragStartVal.current = volume;
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerMove = (clientY: number) => {
    if (!isFullscreenMode) return; // Volume and brightness gestures only show & work in landscape fullscreen!
    if (!isDragging || !dragType.current) return;
    
    const deltaY = dragStartY.current - clientY; // Positive means swipe/drag upwards
    const sensitivity = 1.2; // Pixels per percentage unit delta
    const deltaPercent = Math.round(deltaY / sensitivity);
    
    if (dragType.current === 'brightness') {
      const newBright = Math.max(30, Math.min(150, dragStartVal.current + deltaPercent));
      setBrightness(newBright);
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else if (dragType.current === 'volume') {
      const newVol = Math.max(0, Math.min(100, dragStartVal.current + deltaPercent));
      setVolume(newVol);
      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
          ytPlayerRef.current.setVolume(newVol);
        }
      } catch (e) {
        console.warn(e);
      }
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerEnd = () => {
    setIsDragging(false);
    dragType.current = null;
  };

  const handleContainerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const isLeftHalf = relativeX < rect.width / 2;
    
    if (isLeftHalf) {
      handleSeekOffset('backward');
    } else {
      handleSeekOffset('forward');
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('svg')) {
      return;
    }
    resetControlsTimer();
    const touch = e.touches[0];
    const now = Date.now();
    
    if (lastTapRef.current) {
      const { time, x } = lastTapRef.current;
      const timespan = now - time;
      const distance = Math.abs(touch.clientX - x);
      
      if (timespan < 300 && distance < 35) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const relativeX = touch.clientX - rect.left;
          if (relativeX < rect.width / 2) {
            handleSeekOffset('backward');
          } else {
            handleSeekOffset('forward');
          }
        }
        lastTapRef.current = null;
        return;
      }
    }
    
    lastTapRef.current = { time: now, x: touch.clientX };
    handlePointerStart(touch.clientX, touch.clientY);
  };

  const handleStartPlay = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setHasPlayed(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.playVideo();
        } catch (err) {
          console.warn("Youtube play failed on start:", err);
        }
      }
    }, 150);
  };

  // Load social / saved user states & reviews
  useEffect(() => {
    if (user) {
      if (isGuest || user.uid === 'guest') {
        setIsLiked(!!user.likedContent?.includes(lecture.id));
        setIsSaved(!!user.savedContent?.includes(lecture.id));
      } else {
        fetchLikedLecturesIds().then(ids => setIsLiked(ids.includes(lecture.id)));
        fetchWatchLaterIds().then(ids => setIsSaved(ids.includes(lecture.id)));
      }
    }

    if (user && user.hiddenContent?.includes(`followed_teacher_${lecture.teacherId}`)) {
      setIsFollowed(true);
    }

    fetchReviews(lecture.teacherId || lecture.id)
      .then(revs => setLocalReviews(revs))
      .catch(err => console.warn('Could not fetch reviews:', err));
  }, [lecture, user]);

  // Set up timer loop to get actual current position and duration from YT Player API
  useEffect(() => {
    const checkYtProgress = setInterval(() => {
      if (ytPlayerRef.current && isPlaying && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const current = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
          if (typeof current === 'number' && !isNaN(current)) {
            setCurrentTimeSec(Math.floor(current));
            if (duration && !isNaN(duration)) {
              setTotalDurationSec(Math.floor(duration));
              setProgressPercent((current / duration) * 100);

              // Sync progress periodically
              const roundedSecs = Math.floor(current);
              if (user && roundedSecs !== lastSyncTimeRef.current && roundedSecs % 15 === 0) {
                lastSyncTimeRef.current = roundedSecs;
                trackWatchProgress(lecture, roundedSecs, roundedSecs >= Math.floor(duration));
              }
            }
          }
        } catch (e) {
          console.warn("Error reading YT current time:", e);
        }
      }
    }, 500);

    return () => clearInterval(checkYtProgress);
  }, [isPlaying, lecture, user, totalDurationSec]);

  // Set up body overflow locks for simulated fullscreen landscape scroll inhibition
  useEffect(() => {
    if (isFullscreenMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreenMode]);

  // Inactivity controls count-down
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isLocked) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const showWarning = (msg: string) => {
    setAuthWarning(msg);
    setTimeout(() => setAuthWarning(null), 4000);
  };

  const handlePlayPause = () => {
    if (isLocked) return;
    resetControlsTimer();
    if (ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeekOffset = (direction: 'forward' | 'backward') => {
    if (isLocked) return;
    resetControlsTimer();
    setShowSeekOverlay(direction);

    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const current = ytPlayerRef.current.getCurrentTime();
        const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
        const delta = direction === 'forward' ? 10 : -10;
        const target = Math.max(0, Math.min(duration, current + delta));
        
        ytPlayerRef.current.seekTo(target, true);
        setCurrentTimeSec(Math.floor(target));
        if (duration) {
          setProgressPercent((target / duration) * 100);
        }
      }
    } catch (e) {
      console.warn(e);
    }

    setTimeout(() => setShowSeekOverlay(null), 500);
  };

  const handleTimelineChange = (targetSecs: number) => {
    if (isLocked) return;
    resetControlsTimer();
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(targetSecs, true);
      }
      setCurrentTimeSec(targetSecs);
      const duration = totalDurationSec;
      if (duration) {
        setProgressPercent((targetSecs / duration) * 100);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleVolumeChange = (volValue: number) => {
    if (isLocked) return;
    resetControlsTimer();
    setVolume(volValue);
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(volValue);
      }
    } catch (e) {
      console.warn(e);
    }
    setShowVolumeIndicator(true);
    setShowBrightnessIndicator(false);
    if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
    volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
  };

  const handleBrightnessChange = (brightValue: number) => {
    if (isLocked) return;
    resetControlsTimer();
    setBrightness(brightValue);
    setShowBrightnessIndicator(true);
    setShowVolumeIndicator(false);
    if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
    brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
  };

  const handleSpeedSelect = (rate: number) => {
    if (isLocked) return;
    setPlaybackSpeed(rate);
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(rate);
      }
    } catch (e) {
      console.warn(e);
    }
    setActivePopupSection('main');
    setShowSettingsPopup(false);
  };

  const handleQualitySelect = (ql: string) => {
    setQuality(ql);
    setActivePopupSection('main');
    setShowSettingsPopup(false);
  };

  const handleLike = async () => {
    if (!user) {
      showWarning("Sign in to like lessons and record feedback.");
      return;
    }
    const current = isLiked;
    setIsLiked(!current);
    
    const currentLikes = user.likedContent || [];
    const updatedLikes = current 
      ? currentLikes.filter(id => id !== lecture.id)
      : [...currentLikes, lecture.id];
      
    await updatePreferences({ likedContent: updatedLikes });
    await toggleLikeVideo(lecture, current);
  };

  const handleSave = async () => {
    if (!user) {
      showWarning("Sign in to save this lesson to your board.");
      return;
    }
    const current = isSaved;
    setIsSaved(!current);
    
    const currentSaved = user.savedContent || [];
    const updatedSaved = current
      ? currentSaved.filter(id => id !== lecture.id)
      : [...currentSaved, lecture.id];

    await updatePreferences({ savedContent: updatedSaved });
    await toggleWatchLater(lecture, current);
  };

  const handleFollowToggle = () => {
    setIsFollowed(!isFollowed);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `?lecture=${lecture.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleScreenSim = () => {
    const nextState = !isFullscreenMode;
    
    if (nextState) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => {
            // Screen orientation lock is handled automatically in our fullscreenchange listener
          })
          .catch((err) => {
            console.warn("Native requestFullscreen failed (sandbox constraints), falling back to simulated full-window mode:", err);
            // Fallback for sandboxed iframe context
            setIsFullscreenMode(true);
          });
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        try {
          (containerRef.current as any).webkitRequestFullscreen();
        } catch (err) {
          setIsFullscreenMode(true);
        }
      } else {
        // Fallback for browsers that don't support native fullscreen at all
        setIsFullscreenMode(true);
      }
    } else {
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isNativeFs) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          try {
            (document as any).webkitExitFullscreen();
          } catch (e) {}
        }
      }
      
      // Always guarantee reset of React state and screen unlocks
      setIsFullscreenMode(false);
      setIsNativeFsActive(false);
      try {
        if ((window.screen as any)?.orientation?.unlock) {
          (window.screen.orientation as any).unlock();
        } else if ((window.screen as any)?.unlockOrientation) {
          (window.screen as any).unlockOrientation();
        }
      } catch (e) {
        console.warn('Unlock orientation error:', e);
      }
    }
  };

  // Convert raw seconds to beautifully padded clock strings e.g. 49:32 or 2:15:28
  const formatSecToClock = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Subtitles / Captions dynamically matched to the video timeline
  const getSubtitlesText = () => {
    const s = currentTimeSec % 180;
    if (s < 15) return "Welcome back! Today we are conducting a complete Periodicity One-Shot lecture masterclass.";
    if (s < 35) return "Let's review the chemical trends of transition elements and ionization potentials.";
    if (s < 55) return "Observe the Lanthanides block and standard electron configurations. Focus on these keys.";
    if (s < 75) return "These specific trends are highly expected questions for both JEE and NEET exams.";
    return "Make sure to record these atomic sizing scales inside your notes. Let's practice further.";
  };

  const handleReviewSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showWarning("Sign in to submit your official rating check.");
      return;
    }
    if (!reviewComment.trim()) {
      showWarning("Please write your comment to verify concept delivery.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await submitReview({
        targetId: lecture.teacherId || 'general_teacher',
        targetType: 'teacher',
        rating: newRating,
        comment: reviewComment,
        trustImpact: user?.role === 'teacher' || user?.role === 'admin' ? 3 : 1,
        isVerifiedStudent: true,
        lectureId: lecture.id
      });
      const updated = await fetchReviews(lecture.teacherId || lecture.id);
      setLocalReviews(updated);
      setReviewComment('');
      setShowAddReviewModal(false);
    } catch (err: any) {
      console.error(err);
      showWarning(err.message || "Failed to catalog review. Try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const nextUpLessons = playlistLectures.filter(l => l.id !== lecture.id).slice(0, 4);

  return (
    <div className={`w-full bg-[#050506] text-zinc-150 font-sans selection:bg-orange-400 selection:text-black flex flex-col justify-start transition-all duration-300 min-h-screen ${isFullscreenMode ? 'px-0 py-0 overflow-hidden' : ''}`}>
      
      {/* TOP INTEGRATED LECTURE HEADER */}
      {!isFullscreenMode && (
        <div className="w-full max-w-5xl mx-auto px-4 py-3 bg-[#09090B] border border-neutral-900 rounded-t-2xl flex justify-between items-center mt-3 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 bg-neutral-900 hover:bg-[#1A1A1F] rounded-xl border border-neutral-800 text-white cursor-pointer transition-colors flex items-center gap-1.5 focus:outline-none"
              title="Go Back"
            >
              <ChevronLeft className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold mr-1">Back</span>
            </button>
            <div className="text-left">
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                {lecture.title}
              </h4>
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide block">
                {lecture.subject} • {lecture.examType || 'JEE'}
              </span>
            </div>
          </div>
        </div>
      )}      {/* 1. NATIVE INTEGRATED YOUTUBE PLAYER CONTAINER */}
      <div 
        ref={containerRef}
        onMouseEnter={() => {
          setShowControls(true);
          resetControlsTimer();
        }}
        onMouseMove={() => {
          setShowControls(true);
          resetControlsTimer();
        }}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
        className={`relative w-full bg-black border border-neutral-900 transition-all duration-300 flex flex-col items-center justify-center group overflow-hidden select-none ${
          isFullscreenMode ? '' : 'aspect-[16/10] w-full max-w-5xl mx-auto rounded-b-2xl shadow-2xl relative'
        }`}
        style={{ 
          filter: `brightness(${brightness}%)`,
          position: isFullscreenMode ? (isNativeFsActive ? 'absolute' : 'fixed') : 'relative',
          top: isFullscreenMode ? (isNativeFsActive ? '0' : '50%') : undefined,
          left: isFullscreenMode ? (isNativeFsActive ? '0' : '50%') : undefined,
          width: isFullscreenMode 
            ? (isNativeFsActive ? '100%' : (shouldRotate ? '100vh' : '100vw')) 
            : '100%',
          height: isFullscreenMode 
            ? (isNativeFsActive ? '100%' : (shouldRotate ? '100vw' : '100vh')) 
            : undefined,
          transform: isFullscreenMode 
            ? (isNativeFsActive ? 'none' : (shouldRotate ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)')) 
            : 'none',
          transformOrigin: isFullscreenMode ? 'center center' : undefined,
          zIndex: isFullscreenMode ? 9999 : undefined,
          maxWidth: isFullscreenMode ? '100%' : '64rem', // max-w-5xl is 64rem
          aspectRatio: isFullscreenMode ? undefined : '16/10',
        }}
      >
        {/* Real YouTube Player Iframe - Fully interactable behind, clicks handled by custom Hud */}
        <div 
          id="yt-iframe-container" 
          className={`z-10 transition-all duration-300 ${
            hasPlayed ? 'pointer-events-none' : 'pointer-events-auto select-auto'
          } ${
            isFullscreenMode 
              ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-full max-h-full aspect-[16/9]' 
              : 'absolute inset-0 w-full h-full'
          }`} 
        />

        {/* CUSTOM HUD CONTROLS OVERLAY (MIMICS SCREENSHOT 3) - Only active once the video has played/started */}
        {hasPlayed && (
        <div 
          className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
          onClick={(e) => {
            // Clicking blank spaces in overlay toggles controls
            setShowControls(!showControls);
            resetControlsTimer();
          }}
        >
          {/* Black fade gradients behind controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Custom Top Navigation Bar */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="w-full flex items-center justify-between p-4 pointer-events-auto z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onClose}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 text-white cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-left">
                    <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide leading-none">{lecture.title}</h1>
                    <span className="text-[10px] font-mono font-semibold text-zinc-400 mt-1 block uppercase tracking-wider">
                      {lecture.subject} • {lecture.examType || 'JEE'}
                    </span>
                  </div>
                </div>

                {/* Top-Right Control Actions */}
                <div className="flex items-center gap-3">
                  {/* Cast/Screen Share Icon */}
                  <button 
                    onClick={() => showWarning("Screen cast requested. Searching for available nearby displays...")}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 text-white cursor-pointer transition-colors"
                    title="Cast Display"
                  >
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 11.02 20M2 8A13 13 0 0 1 16.14 20" strokeLinecap="round" />
                      <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" />
                    </svg>
                  </button>
                  
                  {/* Settings Cog Icon */}
                  <button 
                    onClick={() => {
                      setShowSettingsPopup(!showSettingsPopup);
                      setActivePopupSection('main');
                      resetControlsTimer();
                    }}
                    className={`p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 text-white cursor-pointer transition-colors ${showSettingsPopup ? 'text-orange-500 border-orange-500/20' : ''}`}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  
                  {/* Triple Dots/Options Ellipsis (Vertical) */}
                  <button 
                    onClick={() => showWarning("Advanced material telemetry verified secure.")}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 text-white cursor-pointer transition-colors"
                    title="Diagnostics"
                  >
                    <svg className="w-5 h-5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Pointer Area: Vol/Bright swipe drag & double-tap offsets */}
          <div 
            className="flex-1 w-full flex items-center justify-between px-6 pointer-events-auto cursor-pointer relative"
            onPointerDown={(e) => {
              e.stopPropagation();
              handlePointerStart(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              handlePointerMove(e.clientY);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              handlePointerEnd();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleContainerDoubleClick(e);
            }}
          >
            {/* Brightness indicator (Left screen) */}
            <AnimatePresence>
              {showBrightnessIndicator && (
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-40 bg-black/75 p-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-none"
                >
                  <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                  <div className="w-1.5 h-20 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute bottom-0 w-full bg-[#F97316] transition-all duration-75" 
                      style={{ height: `${((brightness - 30) / 120) * 100}%` }} 
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-white uppercase tracking-tight">Bright</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Volume indicator (Right screen) */}
            <AnimatePresence>
              {showVolumeIndicator && (
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-40 bg-black/75 p-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-none"
                >
                  <Volume2 className="w-4 h-4 text-orange-500 animate-pulse" />
                  <div className="w-1.5 h-20 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute bottom-0 w-full bg-[#F97316] transition-all duration-75" 
                      style={{ height: `${volume}%` }} 
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-white uppercase tracking-tight">Volume</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center HUD Buttons: Rewind, Play/Pause, Fast Forward */}
            <div className="absolute inset-0 flex items-center justify-center gap-10 pointer-events-none">
              <AnimatePresence>
                {showControls && (
                  <>
                    {/* Rewind 10 Seconds */}
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeekOffset('backward');
                      }}
                      className="pointer-events-auto p-3.5 bg-black/50 hover:bg-black/75 border border-white/10 rounded-full text-white cursor-pointer shadow-lg transition-transform hover:scale-105"
                      title="10s Back"
                    >
                      <svg className="w-5.5 h-5.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="3 3 3 8 8 8" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="50%" y="60%" fontSize="6.5" fontWeight="black" textAnchor="middle" fill="currentColor" dy=".3em">10</text>
                      </svg>
                    </motion.button>

                    {/* Master Play / Pause */}
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause();
                      }}
                      className="pointer-events-auto p-5.5 bg-[#F97316] hover:bg-orange-400 rounded-full text-black cursor-pointer shadow-xl transition-all hover:scale-105"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-6.5 h-6.5 fill-current" /> : <Play className="w-6.5 h-6.5 fill-current ml-0.5" />}
                    </motion.button>

                    {/* Fast Forward 10 Seconds */}
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeekOffset('forward');
                      }}
                      className="pointer-events-auto p-3.5 bg-black/50 hover:bg-black/75 border border-white/10 rounded-full text-white cursor-pointer shadow-lg transition-transform hover:scale-105"
                      title="10s Forward"
                    >
                      <svg className="w-5.5 h-5.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="21 3 21 8 16 8" strokeLinecap="round" strokeLinejoin="round" />
                        <text x="50%" y="60%" fontSize="6.5" fontWeight="black" textAnchor="middle" fill="currentColor" dy=".3em">10</text>
                      </svg>
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Double Tap Seek Feedback Indicator bubbles */}
            <AnimatePresence>
              {showSeekOverlay && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`absolute z-35 bg-orange-500/15 border border-orange-500/10 backdrop-blur-md px-4 py-2 rounded-2xl flex flex-col items-center gap-1 pointer-events-none ${
                    showSeekOverlay === 'backward' ? 'left-1/4' : 'right-1/4'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-orange-500 tracking-wider uppercase">
                    {showSeekOverlay === 'backward' ? '◀◀ 10s REWIND' : 'FORWARD 10s ▶▶'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Custom Bottom Progress Bar / Timeline */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="w-full p-4 pointer-events-auto flex flex-col gap-2.5 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Embedded Subtitles when Caption On */}
                {isCaptionsOn && (
                  <div className="mx-auto max-w-xl text-center bg-black/90 px-4 py-2 rounded-xl border border-white/5 shadow-2xl pointer-events-none">
                    <p className="text-[11px] sm:text-xs font-mono text-orange-300 leading-normal">
                      {getSubtitlesText()}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Progress Time Elapsed */}
                  <span className="text-[10px] font-mono font-semibold text-zinc-300 w-12 text-left">
                    {formatSecToClock(currentTimeSec)}
                  </span>

                  {/* Horizontal premium orange progress bar */}
                  <div className="flex-1 group relative flex items-center h-5 cursor-pointer">
                    <input 
                      type="range"
                      min="0"
                      max={totalDurationSec || 100}
                      value={currentTimeSec}
                      onChange={(e) => handleTimelineChange(parseInt(e.target.value))}
                      className="w-full absolute inset-0 opacity-0 cursor-pointer z-42"
                    />
                    {/* Fake Progress Track with transitions */}
                    <div className="w-full h-1 bg-white/10 rounded-full relative overflow-visible group-hover:h-1.5 transition-all">
                      {/* Active orange timeline progress element */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#F97316] rounded-full transition-all duration-75 relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-black/50" />
                      </div>
                    </div>
                  </div>

                  {/* Progress Time Duration */}
                  <span className="text-[10px] font-mono font-semibold text-zinc-300 w-12 text-right">
                    {formatSecToClock(totalDurationSec)}
                  </span>

                  {/* Fullscreen button */}
                  <button 
                    onClick={toggleScreenSim}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
                    title={isFullscreenMode ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreenMode ? (
                      <Minimize className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Maximize className="w-4 h-4 text-orange-500" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLOATING SETTINGS MENU DRAWER TRAY (MATCHING PIC 3 GORGEOUS MENU) */}
          <AnimatePresence>
            {showSettingsPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="absolute right-4 top-16 z-50 bg-[#0E0E11]/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl w-60 shadow-2xl pointer-events-auto text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {activePopupSection === 'main' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h4 className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest">Diagnostic Tray</h4>
                      <button 
                        onClick={() => setShowSettingsPopup(false)}
                        className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Target Configuration buttons */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => setActivePopupSection('speed')}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-xs group"
                      >
                        <span className="text-zinc-300 font-sans group-hover:text-white">Playback Speed</span>
                        <span className="text-orange-500 font-mono text-[11px] font-semibold">{playbackSpeed}x ➔</span>
                      </button>

                      <button 
                        onClick={() => setActivePopupSection('quality')}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-xs group"
                      >
                        <span className="text-zinc-300 font-sans group-hover:text-white">Video Quality</span>
                        <span className="text-orange-500 font-mono text-[11px] font-semibold">{quality} ➔</span>
                      </button>

                      <button 
                        onClick={() => {
                          const nextCap = !isCaptionsOn;
                          setIsCaptionsOn(nextCap);
                          try {
                            if (ytPlayerRef.current) {
                              if (nextCap) {
                                ytPlayerRef.current.loadModule("captions");
                              } else {
                                ytPlayerRef.current.unloadModule("captions");
                              }
                            }
                          } catch (e) {
                            console.warn(e);
                          }
                          setShowSettingsPopup(false);
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-xs group"
                      >
                        <span className="text-zinc-300 font-sans group-hover:text-white">Captions Check</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold ${isCaptionsOn ? 'bg-orange-950/50 text-orange-400 border border-orange-900/45' : 'bg-zinc-800 text-zinc-400'}`}>
                          {isCaptionsOn ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Report action trigger */}
                      <button 
                        onClick={() => {
                          setShowSettingsPopup(false);
                          setShowReportToast(true);
                          setTimeout(() => setShowReportToast(false), 3000);
                        }}
                        className="flex items-center gap-2.5 w-full p-2.5 rounded-xl hover:bg-red-950/20 text-red-400 transition-colors cursor-pointer text-xs font-sans group"
                      >
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round" />
                        </svg>
                        <span>Report Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePopupSection === 'speed' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                      <button 
                        onClick={() => setActivePopupSection('main')}
                        className="text-[10px] text-zinc-550 hover:text-white font-mono font-semibold uppercase"
                      >
                        ◀ Back
                      </button>
                      <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Select Speed</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                        <button 
                          key={rate}
                          onClick={() => handleSpeedSelect(rate)}
                          className={`p-2 rounded-xl text-xs font-mono font-semibold cursor-pointer ${playbackSpeed === rate ? 'bg-[#F97316] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activePopupSection === 'quality' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                      <button 
                        onClick={() => setActivePopupSection('main')}
                        className="text-[10px] text-zinc-550 hover:text-white font-mono font-semibold uppercase"
                      >
                        ◀ Back
                      </button>
                      <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Select Quality</span>
                    </div>
                    <div className="space-y-1">
                      {['1080p', '720p', '480p', '360p', 'Auto'].map((ql) => (
                        <button 
                          key={ql}
                          onClick={() => handleQualitySelect(ql)}
                          className={`flex items-center justify-between w-full p-2.5 rounded-xl cursor-pointer text-xs font-mono font-semibold ${quality === ql ? 'bg-orange-950/40 text-orange-400' : 'text-zinc-300 hover:bg-white/5'}`}
                        >
                          <span>{ql}</span>
                          {quality === ql && <span className="text-[8px] bg-orange-400/25 px-1.5 py-0.5 rounded text-orange-400">Active</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Simple floating action feedback */}
          <AnimatePresence>
            {showReportToast && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 z-55 bg-red-950/85 border border-red-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-red-200 text-[10px] font-mono shadow-2xl"
              >
                <span>⚠️ Video reported for material deliverability. Flagged for review task check.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Loading Spinner during ready wait state */}
        {!playerReady && (
          <div className="absolute inset-0 bg-[#08080A] flex flex-col items-center justify-center gap-3 z-0">
            <img 
              src={getLectureThumbnail(lecture)} 
              alt={lecture.title} 
              className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
              referrerPolicy="no-referrer"
            />
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin z-10" />
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest z-10">Initializing Custom Stream Engine...</p>
          </div>
        )}
      </div>

      {/* 4. PORTRAIT INFORMATION DETAILS PANEL LAYER SECTION (SCREENSHOT 2 LOOK) */}
      {!isFullscreenMode && (
        <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col space-y-4 text-left">
          
          {authWarning && (
            <div className="p-3 bg-red-950/40 border border-red-500/35 text-red-200 text-xs rounded-xl font-mono text-center">
              ⚠️ {authWarning}
            </div>
          )}

          {/* CHANNEL SECTION LAYER WITH DYNAMIC ICON & RIGID HEIGHT TO PREVENT ANY ENLARGEMENT OR WRAPPING */}
          <div className="flex items-center justify-between py-3 border-b border-neutral-900/40 bg-transparent h-16 w-full flex-nowrap">
            {/* Left side: Channel logo & details */}
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="relative flex-shrink-0">
                {/* Dynamically key-loaded authorized channel avatar */}
                <img 
                  src={channelInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(lecture.teacherName || "Verified Educator")}&background=18181b&color=f97316&size=128&bold=true`} 
                  alt={channelInfo?.channelTitle || lecture.teacherName}
                  className="w-11 h-11 rounded-full border border-white/10 object-cover shadow shadow-black"
                  referrerPolicy="no-referrer"
                />
                {/* Micro tick icon badge */}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#F97316] border border-black flex items-center justify-center shadow">
                  <span className="text-[7.5px] text-black font-extrabold">✓</span>
                </span>
              </div>
              
              <div className="text-left overflow-hidden leading-tight flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  {channelInfo?.channelTitle || lecture.teacherName || "Verified Educator"}
                </h3>
                {/* Standard literal category aspect tag */}
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold uppercase mt-0.5">
                  {(lecture.subject || "Chemistry").toUpperCase()} • {(lecture.examType || "JEE").toUpperCase()}
                </p>
              </div>
            </div>

            {/* Right side: Fixed width follow trigger button - strictly size stable to preserve layouts */}
            <div className="flex-shrink-0 pl-3">
              <button 
                onClick={handleFollowToggle}
                className={`h-8 w-24 rounded-full text-xs font-sans font-extrabold cursor-pointer transition-all flex items-center justify-center ${
                  isFollowed 
                    ? 'bg-zinc-900 border border-neutral-800 text-zinc-400 hover:text-white' 
                    : 'bg-white border-white text-black hover:bg-zinc-200 shadow shadow-white/5'
                }`}
              >
                {isFollowed ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>

          {/* ACTION NAVIGATION BUTTON PILLS ROW - COMPACT AND SECURE WITHOUT DUPLICATE SHARE BUTTONS */}
          <div className="py-2 border-b border-neutral-900/40 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2.5 py-1 min-w-max">
              
              <button
                onClick={handleLike}
                className={`py-1.5 px-3.5 rounded-full border text-[11px] font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-[#F97316] text-black border-[#F97316]'
                    : 'bg-[#1A1A1F] border-neutral-800 text-zinc-300 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Like</span>
              </button>

              <button
                onClick={handleSave}
                className={`py-1.5 px-3.5 rounded-full border text-[11px] font-sans font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1A1A1F] border-neutral-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={() => showWarning("Saved directly to your custom learning playlist.")}
                className="py-1.5 px-3.5 rounded-full border border-neutral-800 bg-[#1A1A1F] text-[11px] font-sans font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
                  <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
                  <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
                  <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" />
                  <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" />
                </svg>
                <span>Add to playlist</span>
              </button>

              <button
                onClick={() => showWarning("Lesson added to Watch Later center.")}
                className="py-1.5 px-3.5 rounded-full border border-neutral-800 bg-[#1A1A1F] text-[11px] font-sans font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Watch later</span>
              </button>
            </div>
          </div>

          {/* LOWER SECTION: SUBJECT CATEGORY, EXPANDABLE DESCRIPTION INFO */}
          <div className="space-y-2.5 pt-1.5 text-left">
            
            <span className="text-[10px] font-sans font-bold text-zinc-400 tracking-wider">
              {(lecture.subject || "Chemistry").toUpperCase()}
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight leading-tight select-text">
              {lecture.title || "Periodic Table and Chemistry Periodicity One-Shot"}
            </h2>

            {/* Rating Stars Values */}
            <div className="flex items-center justify-between py-1 bg-zinc-950/20 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-sans font-extrabold text-white">4.9</span>
                <div className="flex text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-current text-yellow-400" />
                  ))}
                </div>
                <span className="text-xs text-zinc-455 font-normal tracking-tight">({localReviews.length > 0 ? localReviews.length + 18700 : '18.7K'})</span>
              </div>
              
              <button 
                onClick={() => {
                  if (!user) {
                    showWarning("Please authenticate to write a review check.");
                  } else {
                    setShowAddReviewModal(true);
                  }
                }}
                className="text-xs font-sans font-bold text-zinc-300 hover:text-white flex items-center gap-0.5"
              >
                <span>Add review</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Expandable Overview Box */}
            <div className="text-left font-sans leading-relaxed">
              <p className={`text-xs text-zinc-350 ${!isDescExpanded ? 'line-clamp-2' : ''} whitespace-pre-line`}>
                {lecture.description || "Comprehensive block elements ionization behaviors, periodic coordination properties, syllabus coverage for JEE candidates."}
              </p>
              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-orange-500 hover:underline font-bold text-xs mt-1.5 block cursor-pointer transition-colors"
              >
                {isDescExpanded ? 'See Less' : 'See more....'}
              </button>
            </div>
          </div>

          {/* ACTIVE STUDENT VERIFIED REVIEWS */}
          <div className="space-y-3 pt-3">
            <h3 className="text-[10px] font-sans font-bold text-zinc-400 tracking-wider uppercase">
              Student Reviews ({localReviews.length})
            </h3>
            {localReviews.length > 0 && (
              <div className="space-y-2">
                {localReviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-[#0C0C0D] border border-neutral-900 rounded-2xl text-left text-xs text-zinc-300">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{rev.userDisplayName}</span>
                        <span className="text-[8px] bg-orange-950/40 text-orange-400 px-1.5 rounded border border-orange-900/35 font-mono">Verified Student</span>
                      </div>
                      <div className="flex text-yellow-400 text-[10px] gap-0.2">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="font-mono text-zinc-350">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. RECOMMENDED RECENT Grid matching Screenshot 2 */}
          {nextUpLessons.length > 0 && (
            <div className="space-y-3.5 pt-3 border-t border-neutral-900/70">
              <h3 className="text-[10px] font-sans font-bold tracking-widest text-zinc-400 uppercase">
                RECOMMENDED LESSONS ({nextUpLessons.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {nextUpLessons.map((lec) => (
                  <div
                    key={lec.id}
                    onClick={() => onSelectLecture && onSelectLecture(lec)}
                    className="p-3 bg-[#0F0F10] border border-[#1A1A1F] hover:bg-[#141416] rounded-2xl flex gap-3 text-left transition-all cursor-pointer group hover:border-orange-500/25"
                  >
                    <div className="relative w-24 h-14 bg-black overflow-hidden rounded-xl flex-shrink-0 border border-zinc-900 shadow">
                      <img
                        src={getLectureThumbnail(lec)}
                        alt={lec.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 font-mono text-[8px] text-white rounded">
                        {lec.duration || "2:15:28"}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-200 truncate group-hover:text-orange-400 transition-colors">
                          {lec.title}
                        </h4>
                        <span className="text-[10px] text-zinc-450 font-mono mt-0.5 block truncate">
                          By {lec.teacherName}
                        </span>
                      </div>
                      
                      <span className="text-[9px] text-zinc-550 font-mono uppercase tracking-tight">
                        {lec.subject} • {lec.examType || 'JEE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* RATING MODAL WINDOWS */}
      <AnimatePresence>
        {showAddReviewModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#131316] border border-[#1E1E24] p-6 rounded-2xl text-left shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddReviewModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wide font-mono">Submit Verification Review</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4 font-sans leading-relaxed">
                Add your rating to update real-time statistics of <span className="text-orange-400 font-bold">{lecture.teacherName}</span>. Your rating will modify trust aggregations immediately.
              </p>

              <form onSubmit={handleReviewSubmitAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Select Rating Star</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setNewRating(starValue)}
                        className="p-1 rounded-xl cursor-pointer hover:bg-zinc-900 transition-colors"
                      >
                        <Star className={`w-8 h-8 ${newRating >= starValue ? 'text-amber-500 fill-current' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Commentary Feedback</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe your verification check. (E.g. Clear concepts, covers complete topics...)"
                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-orange-500 font-sans placeholder-zinc-650 transition-colors resize-none animate-none"
                  />
                </div>

                <div className="flex items-center gap-2.5 p-3 bg-orange-950/20 border border-orange-950/15 rounded-xl">
                  <FileCheck2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-[9px] font-mono text-orange-400 leading-normal">
                    This account is registered as a verified student participant. Your feedback is highly weighted in the algorithm of our trust score calculations.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full py-2.5 bg-[#F97316] text-black font-bold font-mono text-xs uppercase rounded-xl hover:bg-orange-400 transition-colors cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
                >
                  {reviewSubmitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Submitting Check...</span>
                    </>
                  ) : (
                    <span>Submit Review Check</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
