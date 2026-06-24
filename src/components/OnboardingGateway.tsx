import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface OnboardingGatewayProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

const EXAMS = [
  {
    id: 'JEE',
    name: 'JEE MAIN & ADVANCED',
    desc: 'Engineering entrance focused mathematics, physics, and chemistry syllabus.'
  },
  {
    id: 'NEET',
    name: 'NEET UG MEDICAL',
    desc: 'Pre-medical focused biology, physics, and chemistry core curriculum.'
  }
];

const YEARS = ['2026', '2027', '2028', '2029', '2030'];

export default function OnboardingGateway({ onOpenAuth }: OnboardingGatewayProps) {
  const { user, enableGuestMode, updatePreferences, loading } = useAuth();
  
  // App-level flow step
  // 1: Exam target
  // 2: Target year
  const [step, setStep] = useState<1 | 2>(1);
  
  // Selections
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Track state transitions dynamically based on AuthContext state
  useEffect(() => {
    if (user) {
      if (user.onboardingCompleted) {
        return;
      } else {
        if (user.examType && user.examType !== 'Both' && !selectedExam) {
          setSelectedExam(user.examType);
        }
        if (user.appearingYear && !selectedYear) {
          setSelectedYear(user.appearingYear);
        }
      }
    }
  }, [user]);

  if (loading || user?.onboardingCompleted) {
    return null;
  }

  const handleNextStep1 = () => {
    if (selectedExam) {
      setStep(2);
    }
  };

  const handleFinishOnboarding = async () => {
    if (selectedExam && selectedYear) {
      const examObj = EXAMS.find(e => e.id === selectedExam);
      const finalSubjects = examObj ? (examObj.id === 'JEE' ? ['Physics', 'Chemistry', 'Mathematics'] : examObj.id === 'NEET' ? ['Physics', 'Chemistry', 'Biology'] : ['Physics', 'Chemistry', 'Mathematics', 'Biology']) : [];

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-black border border-white p-6 sm:p-10 rounded-none relative shadow-none font-mono text-left text-white"
        >
          {/* Main Onboarding Header - Black and White Only */}
          <div className="text-center space-y-2 mb-8 border-b border-zinc-800 pb-6">
            <div className="inline-block text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
              BIOVISED
            </div>
            <h1 className="text-lg font-bold tracking-widest text-white uppercase sm:text-xl">
              Configure Personalized Exam Workspace
            </h1>
            <p className="text-[10px] text-zinc-450 max-w-md mx-auto leading-relaxed">
              Setup academic credentials once. The system will automatically configure your study logs and targets. No complex setup, no unnecessary steps.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-bold text-white tracking-widest uppercase">ACADEMIC TARGET</span>
                    <span className="text-[9px] text-zinc-500">STAGE 1 OF 2</span>
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {EXAMS.map((exam) => {
                      const isSelected = selectedExam === exam.id;
                      return (
                        <button
                          key={exam.id}
                          onClick={() => setSelectedExam(exam.id)}
                          type="button"
                          className={`text-left p-4 border transition-colors duration-150 cursor-pointer block w-full ${
                            isSelected
                              ? 'bg-white border-white text-black'
                              : 'bg-black border-zinc-800 hover:border-zinc-500 text-zinc-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold tracking-widest uppercase">{exam.name}</h4>
                            {isSelected && <span className="text-[9px] font-bold">[SELECTED]</span>}
                          </div>
                          <p className={`text-[10px] mt-1 leading-normal ${isSelected ? 'text-zinc-800' : 'text-zinc-500'}`}>
                            {exam.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end items-center pt-4 border-t border-zinc-800">
                  <button
                    onClick={handleNextStep1}
                    disabled={!selectedExam}
                    type="button"
                    className="px-5 py-2 text-xs font-bold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-colors border bg-white text-black border-white hover:bg-zinc-200"
                  >
                    NEXT
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-bold text-white tracking-widest uppercase">TARGET TIMELINE</span>
                    <span className="text-[9px] text-zinc-500">STAGE 2 OF 2</span>
                  </div>
                  
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-4">
                    SELECT EXAM YEAR:
                  </h3>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {YEARS.map((year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          type="button"
                          className={`py-3 text-xs font-bold text-center cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-white border-white text-black'
                              : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500'
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
                  <button
                    onClick={() => setStep(1)}
                    type="button"
                    className="text-[9px] text-zinc-400 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleFinishOnboarding}
                    disabled={!selectedYear}
                    type="button"
                    className="px-5 py-2 text-xs font-bold tracking-wider uppercase cursor-pointer disabled:opacity-30 transition-colors border bg-white text-black border-white hover:bg-zinc-200"
                  >
                    BUILD WORKSPACE
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
