import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, ChevronRight, GraduationCap, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OnboardingGatewayProps {
  onComplete: (exam: string, year: string) => void;
}

const EXAMS = [
  { id: 'JEE', name: 'JEE Main & Advanced', desc: 'Engineering entrance focused analytics', icon: GraduationCap, color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400' },
  { id: 'NEET', name: 'NEET UG Medical', desc: 'Pre-medical biology & physics experts', icon: Star, color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400' },
];

const YEARS = ['2026', '2027', '2028', '2029', '2030'];

export default function OnboardingGateway({ onComplete }: OnboardingGatewayProps) {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && user.examType && user.examType !== 'Both') {
      localStorage.setItem('biovised_onboarding_exam', user.examType);
      localStorage.setItem('biovised_onboarding_year', '2026');
      onComplete(user.examType, '2026');
      setIsOpen(false);
      return;
    }
    const cachedExam = localStorage.getItem('biovised_onboarding_exam');
    const cachedYear = localStorage.getItem('biovised_onboarding_year');
    if (cachedExam && cachedYear) {
      onComplete(cachedExam, cachedYear);
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [user]);

  const handleNextStep = () => {
    if (selectedExam) {
      setStep(2);
    }
  };

  const handleFinish = () => {
    if (selectedExam && selectedYear) {
      localStorage.setItem('biovised_onboarding_exam', selectedExam);
      localStorage.setItem('biovised_onboarding_year', selectedYear);
      onComplete(selectedExam, selectedYear);
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
        {/* Abstract glowing backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2c1f38]/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#162738]/30 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -15 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-[#090909] border border-[#1a1a1a] p-6 sm:p-10 rounded-2xl relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        >
          {/* Main Onboarding Title */}
          <div className="text-center space-y-2 mb-8">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-bold">
              Gateway setup step {step} of 2
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight">
              Personalize Your Biovised Workspace
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Configure your academic focus to instantly filter out sponsor clutter, unrequested categories, shortcuts, and shorts.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-sm font-semibold font-sans text-stone-200 mb-4 text-center">
                    Select your targeted stream focus:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {EXAMS.map((exam) => {
                      const Icon = exam.icon;
                      const isSelected = selectedExam === exam.id;
                      return (
                        <button
                          key={exam.id}
                          onClick={() => setSelectedExam(exam.id)}
                          type="button"
                          className={`relative text-left p-4.5 rounded-xl border transition-all duration-300 flex items-center gap-4 cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-zinc-900 border-white text-white'
                              : 'bg-black hover:bg-[#0d0d0d] border-[#1C1C1C] hover:border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white animate-pulse" />
                          )}
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center border ${exam.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold tracking-wide text-zinc-100">{exam.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{exam.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNextStep}
                    disabled={!selectedExam}
                    type="button"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 cursor-pointer disabled:opacity-40 select-none transition-colors"
                  >
                    Next Stream <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div>
                  <h3 className="text-sm font-semibold font-sans text-stone-200 mb-4">
                    Select target year of examination:
                  </h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {YEARS.map((year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          type="button"
                          className={`w-16 h-16 rounded-full border text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white border-white text-black scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                              : 'bg-black border-[#1C1C1C] text-zinc-500 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8">
                  <button
                    onClick={() => setStep(1)}
                    type="button"
                    className="text-xs text-zinc-400 hover:text-white font-mono cursor-pointer"
                  >
                    ← Back to streams
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={!selectedYear}
                    type="button"
                    className="flex items-center gap-2 px-8 py-3 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 cursor-pointer disabled:opacity-40 transition-colors select-none"
                  >
                    Initialize Personalized Feed <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
