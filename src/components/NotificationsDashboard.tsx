import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationAsRead } from '../services/dbService';
import { AppNotification } from '../types';
import { Bell, Check, ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationsDashboardProps {
  onViewDashboard: (view: 'explore' | 'profile' | 'moderator' | 'recommendations' | 'notifications' | 'search') => void;
  onOpenAuth?: () => void;
}

export default function NotificationsDashboard({ onViewDashboard, onOpenAuth }: NotificationsDashboardProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (user) {
      setLoading(true);
      try {
        const data = await fetchNotifications();
        setNotifications(data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="flex justify-start">
          <button
            onClick={() => onViewDashboard('explore')}
            className="flex items-center gap-2 text-xs font-mono text-zinc-550 hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back Home
          </button>
        </div>

        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-[#222] flex items-center justify-center mx-auto text-zinc-400">
          <Bell className="w-8 h-8" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Sign In Required</h2>
            <p className="text-xs text-zinc-450 leading-relaxed max-w-sm mx-auto">
              Please sign in to your student workspace to view educational notifications, batch rollouts, and portal updates.
            </p>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-6 rounded-full transition-all cursor-pointer"
            >
              Sign In Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-left pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewDashboard('explore')}
            className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-white" /> Notifications Center
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Real-time updates to your personal learning stream
            </p>
          </div>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-[10px] sm:text-xs text-white hover:underline uppercase tracking-wider font-bold font-mono py-1.5 px-3 bg-zinc-900 border border-[#222] rounded cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-zinc-500">
          Syncing secure alerts pipeline...
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto text-zinc-650">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-300">Your notification center is clear</p>
            <p className="text-[10.5px] text-zinc-500 font-mono">Real-time alerts appear when you follow teachers or complete tests</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <motion.div
              layout
              key={n.id}
              onClick={() => {
                if (!n.read) handleMarkAsRead(n.id);
              }}
              className={`p-4 rounded-xl border transition-all text-left relative flex gap-4 ${
                n.read
                  ? 'border-[#1A1A1A] bg-[#0A0A0A]/45 text-zinc-500 hover:bg-[#0A0A0A]/85'
                  : 'border-white/30 bg-[#141414] text-white hover:border-white/70 shadow-[0_4px_12px_rgba(255,255,255,0.02)]'
              }`}
            >
              {/* Type indicator icon */}
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                n.read ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-black font-bold'
              }`}>
                <Bell className="w-3.5 h-3.5" />
              </div>

              {/* Text fields */}
              <div className="space-y-1.5 min-w-0 flex-grow">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[8.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                    n.read ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-800 text-zinc-350 font-bold'
                  }`}>
                    {n.type}
                  </span>

                  {n.createdAt && (
                    <span className="text-[9px] text-zinc-600 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-tight truncate">
                    {n.title}
                  </h4>
                  <p className="text-[11.5px] text-zinc-450 leading-relaxed font-sans">
                    {n.message}
                  </p>
                </div>
              </div>

              {/* Read button */}
              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="self-center p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Mark read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
