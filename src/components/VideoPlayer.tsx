import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  ThumbsUp,
  Bookmark,
  Share2,
  Maximize2,
  Minimize2,
  Hourglass,
  Clock,
  ExternalLink,
  ChevronRight,
  Maximize
} from 'lucide-react';
import { Lecture } from '../types';
import { getLectureThumbnail } from '../services/thumbnailHelper';
import {
  toggleWatchLater,
  toggleLikeVideo,
  trackWatchProgress,
  fetchWatchLaterIds,
  fetchLikedLecturesIds
} from '../services/dbService';

interface VideoPlayerProps {
  lecture: Lecture;
  onClose?: () => void;
  playlistLectures?: Lecture[];
  onSelectLecture?: (lec: Lecture) => void;
}

export default function VideoPlayer({
  lecture,
  onClose,
  playlistLectures = [],
  onSelectLecture
}: VideoPlayerProps) {
  const { user, isGuest } = useAuth();
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [progress, setProgress] = useState<number>(0); // Progress simulated or tracked
  const [duration, setDuration] = useState<number>(3600); // Simulated duration in seconds
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Sync like and watch-later states
  useEffect(() => {
    if (user) {
      fetchLikedLecturesIds().then(ids => {
        setIsLiked(ids.includes(lecture.id));
      });
      fetchWatchLaterIds().then(ids => {
        setIsSaved(ids.includes(lecture.id));
      });
    }

    // Direct background ingestion fetch to cached server proxy
    if (lecture.id) {
      fetch('/api/youtube/ingest-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: lecture.id,
          teacherId: lecture.teacherId || null,
          instituteId: lecture.instituteId || null
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log('[Real-Time Reviews Ingestion Status]:', data);
      })
      .catch(err => {
        console.warn('[Real-Time Reviews Ingestion Network Error/Disabled]:', err);
      });
    }

    // Set up default watch progress simulation
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 10, duration);
        // Track the current watch activity progress securely in Firestore
        if (user && next % 30 === 0) {
          trackWatchProgress(lecture, next, next >= duration);
        }
        return next;
      });
    }, 10000); // update progress simulation in background

    return () => clearInterval(interval);
  }, [lecture, user]);

  const showWarning = (msg: string) => {
    setAuthWarning(msg);
    setTimeout(() => {
      setAuthWarning(null);
    }, 4000);
  };

  const handleLike = async () => {
    if (isGuest || !user) {
      showWarning("Authenticated users only can bookmark liked lessons.");
      return;
    }
    const current = isLiked;
    setIsLiked(!current);
    await toggleLikeVideo(lecture, current);
  };

  const handleSave = async () => {
    if (isGuest || !user) {
      showWarning("Verify your profile credentials to access Watch Later bookmarks.");
      return;
    }
    const current = isSaved;
    setIsSaved(!current);
    await toggleWatchLater(lecture, current);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `?lecture=${lecture.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleScreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Filter playlistLectures to only show relevant keyword-matched topics and sequence logical order
  const getSmartRecommendations = () => {
    if (!playlistLectures || playlistLectures.length === 0) return [];

    // Exclude the currently playing lecture
    const others = playlistLectures.filter(l => l.id !== lecture.id);

    const currentTitleLower = lecture.title.toLowerCase();
    const currentSubjectLower = (lecture.subject || "").toLowerCase();

    // Check sequence numbers
    const getCurrentPartNumber = (title: string): number | null => {
      const match = title.match(/(?:part|pt|lecture|l|class|chap|chapter|part-|pt-)\s*([0-9]+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    const currentPart = getCurrentPartNumber(currentTitleLower);

    // Extract core topic nouns
    const stopWords = new Set(['part', 'pt', 'lecture', 'l', 'class', 'chap', 'chapter', 'in', 'english', 'hindi', 'revision', 'one', 'shot', 'oneshot', 'complete', 'by', 'sir', 'for', 'and', 'the', 'of', 'with', 'a', 'an']);
    const keywords = currentTitleLower
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    const scored = others.map(l => {
      const tLower = l.title.toLowerCase();
      let score = 0;

      // Subject match
      if ((l.subject || "").toLowerCase() === currentSubjectLower) {
        score += 10;
      }

      // Keyword matches
      keywords.forEach(keyword => {
        if (tLower.includes(keyword)) {
          score += 15;
        }
      });

      // Part order matching: e.g. Part 1 -> Part 2
      const otherPart = getCurrentPartNumber(tLower);
      if (currentPart !== null && otherPart !== null) {
        if (otherPart === currentPart + 1) {
          score += 100; // Give absolute highest priority to immediate next sequence part
        } else if (otherPart > currentPart) {
          score += 30;  // High weight for other subsequent parts
        } else {
          score -= 10;  // Penalty for previous parts
        }
      }

      // If we find sub-topic key overlap
      const matchingKeywordsCount = keywords.filter(w => tLower.includes(w)).length;
      if (matchingKeywordsCount > 0) {
        score += matchingKeywordsCount * 25;
      }

      return { lecture: l, score };
    });

    // Filter to only matching keyword topics/lessons, or fall back to same subject
    const filtered = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.lecture);

    return filtered;
  };

  const recommendationsToDisplay = getSmartRecommendations().length > 0
    ? getSmartRecommendations()
    : playlistLectures.filter(l => l.id !== lecture.id);

  // Convert seconds to readable format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-1 sm:px-2 py-2 flex flex-col lg:flex-row gap-6">
      {/* Primary Streaming Stage (Left) */}
      <div className="flex-1 space-y-4" ref={playerRef}>
        <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-2xl">
          {/* IFrame Video embed */}
          <iframe
            src={`${lecture.videoUrl}?autoplay=1&rel=0`}
            title={lecture.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video meta controls */}
        <div className="space-y-4 py-2 px-1 text-left">
          {authWarning && (
            <div className="p-3 bg-red-955/30 border border-dashed border-red-500/45 text-red-200 text-xs rounded-xl font-mono text-center animate-pulse">
              ⚠️ {authWarning}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5 justify-start">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-850 text-zinc-300 px-2.5 py-0.5 rounded">
                  {lecture.subject}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-white text-black px-2.5 py-0.5 rounded">
                  {lecture.examType}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 px-2.5 py-0.5 rounded">
                  {lecture.contentType}
                </span>
              </div>
              <h2 className="text-xl font-display font-semibold text-white tracking-tight leading-snug text-left">
                {lecture.title}
              </h2>
            </div>
          </div>

          {/* Social/Interaction Bar - ALWAYS BELOW TITLE AND ABOVE DESCRIPTION, HORIZONTALLY SCROLLABLE IN ONE LINE */}
          <div className="py-2 border-t border-b border-neutral-900/60">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1.5 w-full">
              <button
                onClick={handleLike}
                className={`py-1.5 px-4 rounded-full border text-xs font-sans font-medium flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 ${
                  isLiked
                    ? 'bg-[#2DD4BF] text-[#0A0A0A] border-[#2DD4BF] font-semibold'
                    : 'bg-[#141415] border-[#212123] text-zinc-300 hover:text-white'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-[#0A0A0A]' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </button>

              <button
                onClick={handleSave}
                className={`py-1.5 px-4 rounded-full border text-xs font-sans font-medium flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 ${
                  isSaved
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#141415] border-[#212123] text-zinc-300 hover:text-white'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleShare}
                className="py-1.5 px-4 rounded-full border border-[#212123] bg-[#141415] text-xs font-sans font-medium text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer transition-all flex-shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? 'Copied' : 'Share'}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="py-1.5 px-4 rounded-full border border-neutral-800 bg-[#161618] hover:bg-zinc-800 text-xs font-sans font-medium text-white cursor-pointer transition-all flex-shrink-0"
                >
                  Exit Player
                </button>
              )}

              <div className="flex items-center gap-1.5 ml-auto text-[10px] text-zinc-500 font-mono flex-shrink-0 bg-zinc-950/40 px-2.5 py-1 rounded-full border border-neutral-900/60">
                <Clock className="w-3.5 h-3.5 text-zinc-650" />
                <span>{lecture.duration}</span>
              </div>
            </div>
          </div>

          {/* YouTube Style Collapsible Description Box - BELOW LIKES ACTION BAR */}
          <div 
            onClick={() => !isDescExpanded && setIsDescExpanded(true)}
            className={`p-4 rounded-2xl bg-[#141415]/70 hover:bg-[#141415] transition-all text-left group ${!isDescExpanded ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">About Lesson Description</span>
              {!isDescExpanded && (
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-350 transition-colors">Tap or click box to expand</span>
              )}
            </div>
            
            <p className={`text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text ${!isDescExpanded ? 'line-clamp-2' : ''}`}>
              {lecture.description || "No description provided for this lesson."}
            </p>

            <div className="mt-2 text-left">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescExpanded(!isDescExpanded);
                }}
                className="text-[#2DD4BF] hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                {isDescExpanded ? 'Show Less' : '...more'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Sidepanel (Right) */}
      {recommendationsToDisplay.length > 0 && (
        <div className="w-full lg:w-80 bg-[#141415]/30 rounded-2xl p-4 flex flex-col max-h-[500px]">
          <h3 className="text-[10px] font-mono font-bold text-zinc-400 mb-4 uppercase tracking-wider pb-2 border-b border-neutral-900/60">
            Recommended Lessons ({recommendationsToDisplay.length})
          </h3>
          <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
            {recommendationsToDisplay.slice(0, 12).map((lec) => (
              <div
                key={lec.id}
                onClick={() => onSelectLecture && onSelectLecture(lec)}
                className={`p-2 rounded-xl text-left transition-colors cursor-pointer border flex gap-3 items-center ${
                  lec.id === lecture.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#0F0F10] border-[#1C1C1D] text-zinc-400 hover:bg-[#171717] hover:text-white'
                }`}
              >
                <img
                  src={getLectureThumbnail(lec)}
                  alt={lec.title}
                  className="w-16 h-10 object-cover rounded-lg border border-neutral-900"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{lec.title}</p>
                  <span className={`text-[9px] font-mono uppercase mt-1 block ${lec.id === lecture.id ? 'text-zinc-650' : 'text-zinc-500'}`}>
                    {lec.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
