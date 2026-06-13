import { useAuth } from '../context/AuthContext';

interface HeroProps {
  onExploreLectures: () => void;
  onExploreTeachers: () => void;
}

export default function Hero({
  onExploreLectures,
  onExploreTeachers
}: HeroProps) {
  const { user } = useAuth();

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 py-6 md:py-10">
      <div className="relative w-full aspect-auto md:aspect-[16/6] rounded-2xl border border-[#262626] bg-[#111111] overflow-hidden p-6 md:p-10 flex flex-col items-start justify-center gap-8 group">
        
        {/* Simple elegant light radial aura, extremely minimal */}
        <div className="absolute inset-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-700 via-transparent to-transparent pointer-events-none" />

        {/* Content column - Left */}
        <div className="flex-1 text-left z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-white text-black text-[10px] font-bold tracking-widest uppercase">
              Spotlight
            </span>
            <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-widest uppercase">
              JEE & NEET DIRECTORY
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tighter leading-tight">
            Discover the Best JEE & NEET Lectures.
          </h2>

          <p className="text-xs md:text-sm text-zinc-400 font-sans leading-relaxed max-w-xl">
            Biovised aggregates verified playlists, batches, and lectures across chemistry, mathematics, biology, and physics. No sponsored ratings. No hardcoded bias. Only real verified student reviews.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={onExploreLectures}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 px-6 rounded-full transition-all cursor-pointer whitespace-nowrap"
            >
              Stream Core One-Shots
            </button>
            <button
              onClick={onExploreTeachers}
              className="bg-transparent hover:bg-zinc-900 border border-zinc-700 text-white text-xs font-bold py-2.5 px-6 rounded-full transition-all cursor-pointer whitespace-nowrap"
            >
              Check Trust Directory
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
