import { Search, Bell, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';

interface HeaderProps {
  onSearchChange: (query: string) => void;
  onSearchSubmit?: () => void;
  onViewDashboard: (dashboard: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search') => void;
  currentView: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search';
  searchVal: string;
  onOpenAuth: () => void;
  activeExploreTab?: string;
  notifications: AppNotification[];
}

export default function Header({
  onSearchChange,
  onSearchSubmit,
  onViewDashboard,
  currentView,
  searchVal,
  onOpenAuth,
  activeExploreTab,
  notifications
}: HeaderProps) {
  const { user, isGuest } = useAuth();
  const hasUnread = notifications.some(n => !n.read);

  const shouldRedirectToSearch = currentView !== 'explore' || !activeExploreTab || activeExploreTab === 'home';

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-black border-b border-[#1A1A1A] px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 font-sans">
      {/* Brand logo */}
      <div className="flex items-center">
        <button
          onClick={() => onViewDashboard('explore')}
          className="flex items-center focus:outline-none cursor-pointer"
        >
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans select-none">
            Biovised
          </span>
        </button>
      </div>

      {/* Global Search box in Header */}
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
        className="flex-grow max-w-sm sm:max-w-md mx-3 sm:mx-6 relative"
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
            if (shouldRedirectToSearch) {
              onViewDashboard('search');
            }
          }}
          placeholder="Search..."
          className="w-full h-10 bg-[#0E0E0E] hover:bg-[#121212] border border-[#1F1F1F] focus:border-zinc-500 rounded-full pl-10 pr-4 text-xs font-sans text-white placeholder-zinc-500 outline-none transition-all"
        />
      </form>

      {/* Utilities: Notifications, Profile, and Console */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {user ? (
          <>
            {/* Moderator/Admin shortcut queue trigger */}
            {user?.email === 'adarshaman898@gmail.com' && (
              <button
                onClick={() => onViewDashboard('moderator')}
                className={`h-10 px-3 rounded-full border transition-all flex items-center gap-1.5 text-[10px] font-mono cursor-pointer ${
                  currentView === 'moderator'
                    ? 'bg-neutral-900 border-white text-white'
                    : 'bg-transparent border-neutral-800 text-zinc-400 hover:text-white'
                }`}
                title="Moderation Console"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="hidden leading-none lg:inline capitalize">Admin</span>
              </button>
            )}

            {/* Notification alert container */}
            <button
              onClick={() => onViewDashboard('notifications')}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative ${
                currentView === 'notifications'
                  ? 'bg-neutral-900 text-white border border-white/20'
                  : 'text-zinc-300 hover:text-white hover:bg-neutral-900'
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
              className="hidden sm:inline bg-white hover:bg-zinc-200 text-black text-xs font-bold py-1.5 px-4 rounded-full transition-all cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
