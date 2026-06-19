import { Search, Bell, User as UserIcon, ShieldAlert, SlidersHorizontal, X, Clock, ArrowUpLeft, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { useState } from 'react';

interface HeaderProps {
  onSearchChange: (query: string) => void;
  onSearchSubmit?: () => void;
  onViewDashboard: (dashboard: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search') => void;
  currentView: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search';
  searchVal: string;
  onOpenAuth: () => void;
  activeExploreTab?: string;
  notifications: AppNotification[];
  
  // Smart search scoping details
  showFilters: boolean;
  onToggleFilters: () => void;
  isFilterSupported: boolean;
  onFocus?: () => void;
  
  searchSuggestions?: string[];
  currentExamType?: string;
  onVoiceSearchClick?: () => void;
}

export default function Header({
  onSearchChange,
  onSearchSubmit,
  onViewDashboard,
  currentView,
  searchVal,
  onOpenAuth,
  activeExploreTab,
  notifications,
  showFilters,
  onToggleFilters,
  isFilterSupported,
  onFocus,
  searchSuggestions = [],
  currentExamType = 'NEET',
  onVoiceSearchClick
}: HeaderProps) {
  const { user } = useAuth();
  const [isFocused, setIsFocused] = useState(false);
  const hasUnread = notifications.some(n => !n.read);

  const shouldRedirectToSearch = currentView !== 'explore' || !activeExploreTab || activeExploreTab === 'home';

  const getPlaceholder = () => {
    if (currentView !== 'explore') return "Search lessons, badges & educators...";
    switch (activeExploreTab) {
      case 'tests':
        return "Search Mock Tests (Allen, Aakash, MathonGo...)";
      case 'teachers':
        return "Search Registered Educators (HC Verma, NV Sir...)";
      case 'playlists':
        return "Search YouTube Playlists...";
      case 'batches':
        return "Search Course Batches...";
      case 'lecture':
        return "Search Video Chapters...";
      case 'institutes':
        return "Search Academies...";
      default:
        return "Search lessons, badges & educators...";
    }
  };

  const getCuratedFallback = () => {
    const exam = currentExamType || 'NEET';
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

  const refinedSuggestions = searchSuggestions.filter(item => {
    const stream = currentExamType || 'NEET';
    const lowerItem = item.toLowerCase();
    if (stream === 'NEET') {
      if (lowerItem.includes('math') || lowerItem.includes('mathematics') || lowerItem.includes('jee')) return false;
    }
    if (stream === 'JEE') {
      if (lowerItem.includes('bio') || lowerItem.includes('biology') || lowerItem.includes('neet')) return false;
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-black border-b border-[#1A1A1A] px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 font-sans">
      {/* Brand logo */}
      <div className="flex items-center">
        <button
          onClick={() => {
            onSearchChange('');
            onViewDashboard('explore');
          }}
          className="flex items-center focus:outline-none cursor-pointer"
        >
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans select-none">
            Biovised
          </span>
        </button>
      </div>

      {/* Global & Section-Scoped Search box in Header */}
      <div className="flex-grow max-w-sm sm:max-w-md mx-3 sm:mx-6 flex items-center gap-2 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (shouldRedirectToSearch) {
              onViewDashboard('search');
            }
            if (searchVal.trim() !== '') {
              onSearchSubmit?.();
            }
          }}
          className="relative flex-grow"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (shouldRedirectToSearch) {
                onViewDashboard('search');
              }
            }}
            onFocus={() => {
              setIsFocused(true);
              if (shouldRedirectToSearch) {
                onViewDashboard('search');
              } else if (onFocus) {
                onFocus();
              }
            }}
            onBlur={() => setTimeout(() => setIsFocused(false), 240)}
            placeholder={getPlaceholder()}
            className="w-full h-10 bg-[#0E0E0E] hover:bg-[#121212] border border-[#1F1F1F] focus:border-zinc-500 rounded-full pl-10 pr-20 text-xs font-sans text-white placeholder-zinc-500 outline-none transition-all"
          />
          
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {onVoiceSearchClick && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onVoiceSearchClick();
                }}
                className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Search with voice"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
            {searchVal && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isFilterSupported && isFocused && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFilters();
                }}
                className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 ${
                  showFilters
                    ? 'text-white'
                    : 'text-zinc-350 hover:text-white'
                }`}
                title="Search filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* Suggestions Dropdown Container (Inside form with dynamic mobile-responsive centering and expansion) */}
          {isFocused && (
            <div className="fixed top-16 left-0 right-0 bottom-0 h-[calc(100vh-4rem)] sm:absolute sm:inset-auto sm:left-0 sm:right-0 sm:top-11 sm:h-auto sm:-translate-x-0 sm:w-full z-50 bg-[#070708] sm:bg-[#0B0B0C] border-t border-[#151517] sm:border sm:border-[#1A1A1C] sm:rounded-2xl shadow-2xl overflow-y-auto sm:overflow-hidden py-3 sm:py-2 text-left font-sans animate-in fade-in slide-in-from-top-1 duration-150">
              
              {/* Curated / Fallback */}
              {searchVal.trim() === '' ? (
                <div>
                  <div className="flex items-center justify-between px-4 pb-2 pt-1 sm:pt-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                      You may like
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsFocused(false);
                      }}
                      className="sm:hidden text-[10px] font-mono font-bold text-[#EEEEEE] active:text-white uppercase tracking-wider px-2.5 py-1 rounded border border-zinc-800 bg-zinc-950"
                    >
                      Close
                    </button>
                  </div>
                  {getCuratedFallback().map((term, sIdx) => (
                    <div
                      key={sIdx}
                      onMouseDown={() => {
                        onSearchChange(term);
                        if (onSearchSubmit) onSearchSubmit();
                      }}
                      className="flex items-center justify-between px-4 py-3.5 sm:py-2 hover:bg-[#151517] active:bg-[#202022] cursor-pointer transition-colors border-b border-zinc-950/40 sm:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0 animate-none" />
                        <span className="text-[13px] sm:text-xs text-zinc-350 sm:text-zinc-300 font-normal font-sans whitespace-normal break-words py-0.5 leading-snug pr-2">
                          {term}
                        </span>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSearchChange(term);
                        }}
                        className="p-1.5 sm:p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors shrink-0"
                        title="Fill query"
                      >
                        <ArrowUpLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-4 pb-2 pt-1 sm:pt-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                      Search Suggestions
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsFocused(false);
                      }}
                      className="sm:hidden text-[10px] font-mono font-bold text-[#EEEEEE] active:text-white uppercase tracking-wider px-2.5 py-1 rounded border border-zinc-800 bg-zinc-950"
                    >
                      Close
                    </button>
                  </div>
                  {refinedSuggestions.length > 0 ? (
                    refinedSuggestions.map((term, sIdx) => (
                      <div
                        key={sIdx}
                        onMouseDown={() => {
                          onSearchChange(term);
                          if (onSearchSubmit) onSearchSubmit();
                        }}
                        className="flex items-center justify-between px-4 py-3.5 sm:py-2 hover:bg-[#151517] active:bg-[#202022] cursor-pointer transition-colors border-b border-zinc-950/40 sm:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
                          <span className="text-[13px] sm:text-xs text-zinc-350 sm:text-zinc-300 font-normal font-sans whitespace-normal break-words py-0.5 leading-snug pr-2">
                            {term}
                          </span>
                        </div>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSearchChange(term);
                          }}
                          className="p-1.5 sm:p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors shrink-0"
                          title="Fill query"
                        >
                          <ArrowUpLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-zinc-500 font-sans italic">
                      No matching word recommendations for "{searchVal}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Utilities: Notifications, Profile, and Console */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {user ? (
          <>
            {/* Notification alert container */}
            <button
              onClick={() => onViewDashboard('notifications')}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative ${
                currentView === 'notifications'
                  ? 'bg-neutral-900 text-white border border-white/20'
                  : 'text-zinc-350 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF0000]" />
                )}
              </div>
            </button>

            {/* Profile triggering button */}
            <button
              onClick={() => onViewDashboard('profile')}
              className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all cursor-pointer ${
                currentView === 'profile'
                  ? 'border-white bg-neutral-900 text-white'
                  : 'border-[#1F1F1F] bg-[#0E0E0E] hover:border-zinc-500 text-zinc-400 hover:text-white'
              }`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </button>
          </>
        ) : (
          <>
            {/* Guest / Not logged */}
            <button
              onClick={() => {
                onViewDashboard('notifications');
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative ${
                currentView === 'notifications'
                  ? 'bg-neutral-900 text-white border border-white/20'
                  : 'text-zinc-350 hover:text-white hover:bg-neutral-900'
              }`}
              title="Notifications Center"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#FF0000]" />
              </div>
            </button>

            {/* Profile search trigger */}
            <button
              onClick={onOpenAuth}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-[#1F1F1F] bg-[#0E0E0E] hover:border-zinc-500 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Sign in to your space"
            >
              <UserIcon className="w-5 h-5" />
            </button>

            {/* Sign in extra CTA button */}
            <button
              onClick={onOpenAuth}
              className="hidden sm:inline bg-white hover:bg-zinc-205 text-black text-xs font-bold py-1.5 px-4 rounded-full transition-all cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
