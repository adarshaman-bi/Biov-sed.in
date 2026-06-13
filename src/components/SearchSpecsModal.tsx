import { Filter, X, Check, Award, BookOpen, Star, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectFilter: string;
  setSubjectFilter: (val: string) => void;
  examFilter: string;
  setExamFilter: (val: string) => void;
  contentTypeFilter: 'All' | 'lecture' | 'oneshot';
  setContentTypeFilter: (val: 'All' | 'lecture' | 'oneshot') => void;
  sortBy: 'rating' | 'trustScore' | 'popularity';
  setSortBy: (val: 'rating' | 'trustScore' | 'popularity') => void;
  searchQuery: string;
  verifiedOnly?: boolean;
  setVerifiedOnly?: (val: boolean) => void;
}

export default function SearchSpecsModal({
  isOpen,
  onClose,
  subjectFilter,
  setSubjectFilter,
  examFilter,
  setExamFilter,
  contentTypeFilter,
  setContentTypeFilter,
  sortBy,
  setSortBy,
  searchQuery,
  verifiedOnly = false,
  setVerifiedOnly
}: SearchSpecsModalProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    setSubjectFilter('All');
    setExamFilter('All');
    setContentTypeFilter('All');
    setSortBy('trustScore');
    if (setVerifiedOnly) setVerifiedOnly(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Animated backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Panel Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0E0E0E] border border-[#1F1F1F] shadow-[0_12px_45px_rgba(0,0,0,0.8)] rounded-2xl p-6 overflow-hidden z-10 text-left space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#1A1A1A] pb-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-2 bg-white text-black rounded mr-2 tracking-wider">
                Refine Query
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                <Filter className="w-4 h-4 text-white" /> Search Specifications
              </h3>
              {searchQuery && (
                <p className="text-[11px] text-zinc-400 font-mono">
                  Specifying criteria for: <span className="text-white font-semibold">"{searchQuery}"</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 min-w-0 bg-transparent hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                Subject Stream
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectFilter(sub)}
                    className={`py-1.5 px-2.5 rounded-lg text-[10.5px] font-mono font-semibold text-center border cursor-pointer transition-all ${
                      subjectFilter === sub
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent border-zinc-805 text-zinc-450 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Goal Selector */}
            <div className="space-y-2">
              <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                Exam target goal
              </label>
              <select
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-sans"
              >
                <option value="All">All Exams & Goals</option>
                <option value="JEE">JEE Main & Advanced</option>
                <option value="NEET">NEET Medical Prep</option>
              </select>
            </div>

            {/* Two Column Grid for Content Format and Sorting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                  Content Class
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'All', label: 'All' },
                    { id: 'lecture', label: 'Lectures' },
                    { id: 'oneshot', label: 'One Shots' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setContentTypeFilter(f.id as any)}
                      className={`text-[10.5px] font-mono py-1.5 px-3 rounded-lg border cursor-pointer transition-all ${
                        contentTypeFilter === f.id
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-transparent border-zinc-805 text-zinc-450 hover:text-zinc-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                  Order Priority
                </label>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="trustScore">Verified Trust Score</option>
                  <option value="rating">Student stars rating</option>
                  <option value="popularity">Cumulative Subscribers</option>
                </select>
              </div>
            </div>

            {/* Verified Only Toggle */}
            {setVerifiedOnly && (
              <div className="flex items-center justify-between p-3.5 bg-zinc-950/40 border border-[#1f1f1f] rounded-xl text-left">
                <div className="space-y-0.5">
                  <span className="block text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" /> Verified Only mode
                  </span>
                  <span className="block text-[10px] text-zinc-500 font-mono leading-tight">
                    Hides any sources with unverified or pending review metrics.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`w-11 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all ${
                    verifiedOnly ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Action Segment */}
          <div className="flex items-center justify-between pt-4 border-t border-[#161616] mt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-lg text-xs font-mono transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-full transition-all cursor-pointer"
            >
              Apply Specifications
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
