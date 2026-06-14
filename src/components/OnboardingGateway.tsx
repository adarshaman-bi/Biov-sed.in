import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Star,
  LogIn,
  UserPlus,
  ArrowRight,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OnboardingGatewayProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

const EXAMS = [
  {
    id: 'JEE',
    name: 'JEE Main & Advanced',
    desc: 'Engineering entrance focused mathematics, physics & chemistry syllabus.',
    icon: GraduationCap,
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    subjects: ['Physics', 'Chemistry', 'Mathematics']
  },
  {
    id: 'NEET',
    name: 'NEET UG Medical',
    desc: 'Pre-medical focused biology, physics & chemistry core curriculum.',
    icon: Star,
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    subjects: ['Physics', 'Chemistry', 'Biology']
  },
  {
    id: 'Both',
    name: 'Dual Prep / Both',
    desc: 'Access both engineering and medical catalogs concurrently.',
    icon: Sparkles,
    color: 'from-purple-500/20 to-amber-500/10 border-purple-500/30 text-purple-400',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology']
  }
];

const YEARS = ['2026', '2027', '2028', '2029', '2030'];

export default function OnboardingGateway({ onOpenAuth }: OnboardingGatewayProps) {
  const { user, isGuest, enableGuestMode, updatePreferences } = useAuth();
  
  // App-level flow step
  // 0: Auth Selection (Login / Signup / Guest)
  // 1: Exam target
  // 2: Target year
  // 3: Subject selection
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  
  // Selections
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Track state transitions dynamically based on AuthContext state
  useEffect(() => {
    if (user) {
      if (user.onboardingCompleted) {
        // Already completed onboarding, skip completely
        return;
      } else {
        // Logged in or guest mode initialized, but preferences not finished. Force state 1
        if (step === 0) {
          setStep(1);
        }
        // Initialize state fields from user profile if there's any prefilled info
        if (user.examType && user.examType !== 'Both' && !selectedExam) {
          setSelectedExam(user.examType);
        }
        if (user.appearingYear && !selectedYear) {
          setSelectedYear(user.appearingYear);
        }
        if (user.preferredSubjects && user.preferredSubjects.length > 0 && selectedSubjects.length === 0) {
          setSelectedSubjects(user.preferredSubjects);
        }
      }
    } else {
      // No user session, enforce Auth Selection Step 0
      setStep(0);
    }
  }, [user, step]);

  // If already completed onboarding, do not render modal at all
  if (user?.onboardingCompleted) {
    return null;
  }

  const handleNextStep1 = () => {
    if (selectedExam) {
      // Clear subjects that don't match the stream's possible subjects list
      const examObj = EXAMS.find(e => e.id === selectedExam);
      if (examObj) {
        setSelectedSubjects([]);
      }
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    if (selectedYear) {
      setStep(3);
    }
  };

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSelectedSubjects(prev => [...prev, sub]);
    }
  };

  const handleFinishOnboarding = async () => {
    if (selectedExam && selectedYear) {
      // If no subjects were selected, default to all relevant to that stream
      const examObj = EXAMS.find(e => e.id === selectedExam);
      const finalSubjects = selectedSubjects.length > 0 
        ? selectedSubjects 
        : (examObj ? examObj.subjects : []);

      await updatePreferences({
        examType: selectedExam,
        appearingYear: selectedYear,
        preferredSubjects: finalSubjects,
        onboardingCompleted: true
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
        {/* Glow ambient panels */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-950/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-950/25 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl bg-[#0a0a0b] border border-zinc-900 p-6 sm:p-10 rounded-2xl relative shadow-[0_0_50px_rgba(0,0,0,0.85)] font-mono text-left"
        >
          {/* Main Onboarding Header */}
          <div className="text-center space-y-2 mb-8 border-b border-zinc-900 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2 pb-0.5.">
              <Sparkles className="w-3 h-3 text-sky-400 animate-spin-slow" /> Biovised Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug">
              Configure Personalized Exam Workspace
            </h1>
            <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
              Setup your academic credentials once. The algorithm will automatically curate your channel flows and mock tests.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center mb-4">
                  <span className="text-xs text-zinc-400">
                    To save academic stats permanently, identify yourself or proceed immediately:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Join Profile Signup option */}
                  <button
                    onClick={() => onOpenAuth?.('signup')}
                    type="button"
                    className="p-5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-950/40 hover:bg-[#111112] text-left transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-orange-950/30 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-3.5 group-hover:scale-105 transition-transform">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Create Account</h3>
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                      Create student or educator profile to sync preferences across devices permanently.
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-orange-400 font-bold mt-4 uppercase group-hover:text-white transition-colors">
                      Register Now <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Sign In login Option */}
                  <button
                    onClick={() => onOpenAuth?.('signin')}
                    type="button"
                    className="p-5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-950/40 hover:bg-[#111112] text-left transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-sky-950/30 border border-sky-500/20 flex items-center justify-center text-sky-450 mb-3.5 group-hover:scale-105 transition-transform">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Access Sign In</h3>
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                      Already have a configured profile? Load your academic streams instantly.
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-sky-450 font-bold mt-4 uppercase group-hover:text-white transition-colors">
                      Authenticate <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Guest Session Mode Option */}
                  <button
                    onClick={() => enableGuestMode()}
                    type="button"
                    className="p-5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-950/40 hover:bg-[#111112] text-left transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-950/30 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-105 transition-transform">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Continue as Guest</h3>
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                      Instant entrance. Store personalized feeds in your local browser storage.
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-purple-400 font-bold mt-4 uppercase group-hover:text-white transition-colors">
                      Enter as Guest <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-sky-400 tracking-widest uppercase">Academic Selection</span>
                    <span className="text-[10px] text-zinc-500">Step 1 of 3</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-3">
                    Which targeted entrance examination are you aiming for?
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {EXAMS.map((exam) => {
                      const Icon = exam.icon;
                      const isSelected = selectedExam === exam.id;
                      return (
                        <button
                          key={exam.id}
                          onClick={() => setSelectedExam(exam.id)}
                          type="button"
                          className={`relative text-left p-4.5 rounded-xl border transition-all duration-300 flex flex-col justify-between cursor-pointer min-h-[140px] overflow-hidden ${
                            isSelected
                              ? 'bg-zinc-950 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                              : 'bg-zinc-950/20 hover:bg-[#0c0c0e] border-zinc-900 hover:border-zinc-700 text-zinc-450'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-white">
                              <CheckCircle className="w-4 h-4 fill-white text-black" />
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center border shrink-0 ${exam.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="mt-4">
                            <h4 className="text-[11px] font-bold tracking-wider text-zinc-100 uppercase">{exam.name}</h4>
                            <p className="text-[9px] text-zinc-500 mt-1 leading-normal">{exam.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
                  <span className="text-[9px] text-zinc-550 max-w-[280px]">
                    * Feed content, lectures, notes and test modules will restrict to matched patterns.
                  </span>
                  <button
                    onClick={handleNextStep1}
                    disabled={!selectedExam}
                    type="button"
                    className="flex items-center gap-1 px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs cursor-pointer disabled:opacity-40 transition-colors select-none"
                  >
                    Next Goal <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Target Timeline</span>
                    <span className="text-[10px] text-zinc-500">Step 2 of 3</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest text-center mb-6">
                    Select your targeted appearance calendar year:
                  </h3>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    {YEARS.map((year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          type="button"
                          className={`w-16 h-16 rounded-full border text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white border-white text-black scale-105 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-450 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <Calendar className={`w-3.5 h-3.5 mb-1 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-zinc-900">
                  <button
                    onClick={() => setStep(1)}
                    type="button"
                    className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    ← Back to Streams
                  </button>
                  <button
                    onClick={handleNextStep2}
                    disabled={!selectedYear}
                    type="button"
                    className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs cursor-pointer disabled:opacity-40 transition-colors select-none"
                  >
                    Preferred Subjects <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase">Subjects of Focus</span>
                    <span className="text-[10px] text-zinc-500">Step 3 of 3</span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest text-center mb-2">
                    Select your primary preferred subjects:
                  </h3>
                  <p className="text-[10px] text-zinc-500 text-center mb-6">
                    Your recommendation modules will highlight these subjects natively. You can adapt them anytime in Settings.
                  </p>

                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {(() => {
                      const examObj = EXAMS.find(e => e.id === selectedExam);
                      const availableSubjects = examObj ? examObj.subjects : ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
                      return availableSubjects.map(sub => {
                        const isChosen = selectedSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubject(sub)}
                            type="button"
                            className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-zinc-950 border-sky-400 text-sky-400'
                                : 'bg-zinc-950/20 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-850'
                            }`}
                          >
                            <span>{sub}</span>
                            {isChosen ? (
                              <CheckCircle className="w-4 h-4 fill-sky-400 text-black shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-zinc-800 shrink-0" />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-zinc-900">
                  <button
                    onClick={() => setStep(2)}
                    type="button"
                    className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    ← Back to Target Year
                  </button>
                  <button
                    onClick={handleFinishOnboarding}
                    type="button"
                    className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all select-none"
                  >
                    Build Personalized Workspace <Sparkles className="w-3.5 h-3.5" />
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
