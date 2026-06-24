import { useState, FormEvent, useEffect, MouseEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, GraduationCap, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLandingPage?: boolean;
  onGuestBypass?: () => void;
}

export default function AuthModal({ isOpen, onClose, isLandingPage = false, onGuestBypass }: AuthModalProps) {
  const { signInGoogle, signInEmail, signUpEmail, sendPasswordReset, enableGuestMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  
  // Prefill remembered email from localStorage
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [examType, setExamType] = useState<string>('Both');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Remembers previous state for smooth transitions
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('biovised_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
      } else {
        setEmail('');
      }
      setPassword('');
      setDisplayName('');
      setError('');
      setSuccess('');
      setEmailTouched(false);
      setNameTouched(false);
      setPasswordTouched(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Real-time password requirement analysis
  const hasEightChars = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirementsMetCount = [
    hasEightChars,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const passwordStrengthLabel = () => {
    if (password.length === 0) return 'Enter Password';
    if (requirementsMetCount <= 2) return 'Weak Strength';
    if (requirementsMetCount <= 4) return 'Medium Strength';
    return 'Strong Security';
  };

  const passwordStrengthColor = () => {
    if (password.length === 0) return 'bg-zinc-800';
    if (requirementsMetCount <= 2) return 'bg-zinc-700';
    if (requirementsMetCount <= 4) return 'bg-zinc-400';
    return 'bg-white';
  };

  const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const isNameValid = displayName.trim().length >= 3 && displayName.trim().length <= 50;
  const isPasswordValid = requirementsMetCount >= 4; // High standard for educational portals

  const canSubmit = mode === 'signin' 
    ? (isEmailValid && password.length >= 6)
    : mode === 'signup'
    ? (isNameValid && isEmailValid && isPasswordValid)
    : isEmailValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
        // Persist email mock prefill for standard usage
        localStorage.setItem('biovised_remember_email', email);
        onClose();
      } else if (mode === 'signup') {
        if (!isNameValid) throw new Error('Candidate Name must be between 3 and 50 characters');
        if (!isPasswordValid) throw new Error('Password does not meet high safety standards (Needs 4+ checks passed)');
        await signUpEmail(email, password, displayName, role, examType);
        localStorage.setItem('biovised_remember_email', email);
        setSuccess('Profile configured! Security tokens issued successfully.');
        setTimeout(() => onClose(), 1200);
      } else {
        await sendPasswordReset(email);
        setSuccess('Security recovery dispatch sent! Please confirm email mailbox.');
      }
    } catch (err: any) {
      // Graceful mapping of Supabase and Firebase error states into beautifully written candidate tips
      let friendlyError = err?.message || 'Authentication operation failed.';
      const lowerError = friendlyError.toLowerCase();
      
      if (lowerError.includes('invalid-credential') || lowerError.includes('invalid login credentials') || lowerError.includes('invalid_grant')) {
        friendlyError = 'Incorrect credentials. Please verify your email and passcodes, or continue to explore as a Guest.';
      } else if (lowerError.includes('email-already-in-use') || lowerError.includes('user already registered') || lowerError.includes('already exists')) {
        friendlyError = 'This email is already registered. Please sign in or use a different email address.';
      } else if (lowerError.includes('network-request-failed') || lowerError.includes('failed to fetch') || lowerError.includes('network')) {
        friendlyError = 'Network connection intermittent or offline. Please check your internet connection and retry.';
      } else if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
        friendlyError = 'Request frequency rate limit reached. Please wait a minute and try again.';
      } else if (lowerError.includes('signup requires a valid email') || lowerError.includes('invalid email')) {
        friendlyError = 'Please provide a valid, properly formatted email address.';
      }
      setError(friendlyError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setShowGoogleHelp(true);
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isLandingPage) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (showGoogleHelp) {
    return (
      <div 
        onClick={handleBackdropClick}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 text-left ${
          isLandingPage 
            ? 'bg-[#020202]' 
            : 'bg-black/85 backdrop-blur-md animate-fade-in'
        }`}
      >
        <div className="w-full max-w-sm bg-[#09090A] rounded-2xl shadow-2xl p-6 relative overflow-hidden border border-zinc-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-lg font-display font-medium text-amber-400 tracking-tight mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            Google OAuth Check
          </h2>
          <p className="text-xs text-brand-gray mb-4 leading-relaxed">
            Google Sign-In requires Client ID configuration in your active **Supabase Project Settings**.
          </p>
          
          <div className="bg-[#121214] border border-amber-950/40 p-3.5 rounded-xl space-y-2.5 mb-5 text-[11px] text-zinc-300 leading-relaxed font-sans">
            <p>
              ❌ If Google Provider is **not enabled** on your active Supabase project, proceeding will crash with this exact error:  
              <code className="text-red-400 bg-black/40 px-1 py-0.5 rounded font-mono text-[9.5px] block mt-1 break-all select-all">
                "Unsupported provider: provider is not enabled"
              </code>
            </p>
            <p className="text-zinc-400 pt-2 border-t border-zinc-800">
              💡 **No configuration set up?**  
              Create and log in easily with **any email & password** in the Signup tab, or choose **Continue as Guest / Preview Mode** below.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={async () => {
                setShowGoogleHelp(false);
                setError('');
                try {
                  await signInGoogle();
                  onClose();
                } catch (err: any) {
                  setError('Google Sign-In failed: ' + (err?.message || 'Check connection or Supabase settings.'));
                }
              }}
              className="w-full bg-brand-accent hover:bg-neutral-250 text-brand-black font-semibold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              Attempt Google Sign-In Anyway
            </button>
            
            <button
              onClick={() => {
                setShowGoogleHelp(false);
              }}
              className="w-full bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              Cancel & Use Email / Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 text-left ${
        isLandingPage 
          ? 'bg-[#020202]' 
          : 'bg-black/85 backdrop-blur-md animate-fade-in'
      }`}
    >
      <div className="w-full max-w-md bg-[#09090A] rounded-2xl shadow-2xl p-6 relative overflow-hidden border border-zinc-900">
        {/* Emil Kowalski Detail: Subtle visual ambient orb */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />

        {!isLandingPage && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-brand-gray hover:text-brand-accent transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <h2 className="text-xl font-display font-medium text-brand-accent tracking-tight mb-2">
          {mode === 'signin' && 'Sign in to Biovised'}
          {mode === 'signup' && 'Create Biovised Profile'}
          {mode === 'forgot' && 'Reset Access Password'}
        </h2>
        <p className="text-xs text-brand-gray mb-6 leading-relaxed">
          {mode === 'signin' && 'Unlock structured JEE & NEET educational channels'}
          {mode === 'signup' && 'Join the premium platform for medical and engineering prep'}
          {mode === 'forgot' && 'Provide your registered email address to secure your link'}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-lg font-mono flex items-start gap-2 animate-pulse">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg font-mono flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {mode === 'signup' && (
            <>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-mono text-brand-gray font-medium uppercase tracking-wider">Candidate Name</label>
                  <span className={`text-[10px] font-mono ${displayName.length > 50 ? 'text-red-500 font-bold animate-bounce' : 'text-zinc-600'}`}>
                    {displayName.length}/50 chars
                  </span>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onBlur={() => setNameTouched(true)}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                    placeholder="Enter Candidate Full Name"
                    className={`w-full bg-[#121213] border-0 border-b-2 ${
                      nameTouched && !isNameValid 
                        ? 'border-red-500/80' 
                        : nameTouched && isNameValid
                        ? 'border-emerald-500/50'
                        : 'border-[#222224] focus:border-white'
                    } rounded-t-lg rounded-b-none py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-sans transition-all`}
                  />
                </div>
                {nameTouched && !isNameValid && (
                  <p className="mt-1 text-[10px] font-mono text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Minimum 3 characters needed
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Join As</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-[#121213] border-0 border-b-2 border-[#222224] focus:border-white rounded-t-lg rounded-b-none py-2.5 px-3 text-sm text-brand-accent outline-none transition-all"
                  >
                    <option value="user">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="institute">Institute Portal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Exam Goal</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-[#121213] border-0 border-b-2 border-[#222224] focus:border-white rounded-t-lg rounded-b-none py-2.5 px-3 text-sm text-brand-accent outline-none transition-all"
                  >
                    <option value="JEE">JEE</option>
                    <option value="NEET">NEET</option>
                    <option value="Both">Both / All Goals</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-mono text-brand-gray font-medium uppercase tracking-wider">Email Address</label>
              {emailTouched && (
                <span className={`text-[10px] font-mono ${isEmailValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isEmailValid ? 'Email Formatted' : 'Input Valid Email'}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
              <input
                type="email"
                required
                value={email}
                onBlur={() => setEmailTouched(true)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@domain.org"
                className={`w-full bg-[#121213] border-0 border-b-2 ${
                  emailTouched && !isEmailValid 
                    ? 'border-red-500/80' 
                    : emailTouched && isEmailValid
                    ? 'border-emerald-500/50'
                    : 'border-[#222224] focus:border-white'
                } rounded-t-lg rounded-b-none py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-mono transition-all`}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-mono text-brand-gray font-medium uppercase tracking-wider">Secret Password</label>
                {password.length > 0 && (
                  <span className={`text-[10px] font-mono ${
                    requirementsMetCount <= 2 ? 'text-zinc-500 font-bold' : requirementsMetCount <= 4 ? 'text-zinc-300 font-bold' : 'text-white font-extrabold'
                  }`}>
                    {passwordStrengthLabel()}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
                <input
                  type="password"
                  required
                  value={password}
                  onBlur={() => setPasswordTouched(true)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className={`w-full bg-[#121213] border-0 border-b-2 ${
                    passwordTouched && mode === 'signup' && !isPasswordValid
                      ? 'border-red-500/80'
                      : passwordTouched && mode === 'signup' && isPasswordValid
                      ? 'border-emerald-500/50'
                      : 'border-[#222224] focus:border-white'
                  } rounded-t-lg rounded-b-none py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-mono transition-all`}
                />
              </div>

              {/* Dynamic Emil Kowalski style password safety checklist */}
              {mode === 'signup' && (password.length > 0 || passwordTouched) && (
                <div className="mt-3 p-3 bg-brand-black rounded-lg border border-brand-border space-y-2">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden transition-all duration-300">
                    <div 
                      className={`h-full transition-all duration-500 ${passwordStrengthColor()}`}
                      style={{ width: `${(requirementsMetCount / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Check className={`w-3 h-3 ${hasEightChars ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={hasEightChars ? 'text-zinc-350' : ''}>8+ Characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className={`w-3 h-3 ${hasUpperCase ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={hasUpperCase ? 'text-zinc-350' : ''}>Uppercase (A-Z)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className={`w-3 h-3 ${hasLowerCase ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={hasLowerCase ? 'text-zinc-350' : ''}>Lowercase (a-z)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={hasNumber ? 'text-zinc-350' : ''}>Number (0-9)</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Check className={`w-3 h-3 ${hasSpecial ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={hasSpecial ? 'text-zinc-350' : ''}>Special Symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (password.length > 0 && !canSubmit)}
            className="w-full bg-brand-accent hover:bg-neutral-200 text-brand-black font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 font-sans cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Processing request...' : mode === 'signin' ? 'Sign In Credentials' : mode === 'signup' ? 'Create Biovised Profile' : 'Send Instructions'}
          </button>
        </form>

        {mode === 'signin' && (
          <>
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-brand-border"></div>
              <span className="flex-shrink mx-4 text-brand-gray font-mono text-[10px] uppercase">Or Authenticate With</span>
              <div className="flex-grow border-t border-brand-border"></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full bg-brand-black hover:bg-brand-border border border-brand-border text-brand-accent font-medium py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  dom-id="google-path-1"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-2"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-3"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-4"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Account Secure Sign-In
            </button>

            <button
              onClick={() => {
                enableGuestMode();
                if (onGuestBypass) {
                  onGuestBypass();
                } else {
                  onClose();
                }
              }}
              type="button"
              className="w-full mt-2 bg-transparent hover:bg-neutral-900 border border-dashed border-zinc-700 text-zinc-450 font-medium py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              Continue as Guest / Preview Mode
            </button>


          </>
        )}

        <div className="mt-6 flex flex-col gap-2 items-center text-xs font-sans text-brand-gray">
          {mode === 'signin' ? (
            <>
              <button onClick={() => setMode('signup')} className="hover:text-brand-accent transition-colors underline cursor-pointer">
                Need an account? Sign Up instead
              </button>
              <button onClick={() => setMode('forgot')} className="hover:text-brand-accent transition-colors cursor-pointer">
                Forgot password? Recover account
              </button>
            </>
          ) : mode === 'signup' ? (
            <button onClick={() => setMode('signin')} className="hover:text-brand-accent transition-colors underline cursor-pointer">
              Already have an account? Sign In
            </button>
          ) : (
            <button onClick={() => setMode('signin')} className="hover:text-brand-accent transition-colors flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
