import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, GraduationCap, X, RotateCcw } from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInGoogle, signInEmail, signUpEmail, sendPasswordReset, enableGuestMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [examType, setExamType] = useState<string>('Both');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (!displayName.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUpEmail(email, password, displayName, role, examType);
        setSuccess('Account registered successfully!');
        setTimeout(() => onClose(), 1000);
      } else {
        await sendPasswordReset(email);
        setSuccess('Password reset link has been dispatched to your email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication operation failed. Verify details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInGoogle();
      onClose();
    } catch (err: any) {
      setError('Google Sign-In failed: ' + (err?.message || 'Check connection.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-brand-dark border border-brand-border rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-gray hover:text-brand-accent transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-display font-medium text-brand-accent tracking-tight mb-2">
          {mode === 'signin' && 'Sign in to Biovised'}
          {mode === 'signup' && 'Create Biovised Profile'}
          {mode === 'forgot' && 'Reset Access Password'}
        </h2>
        <p className="text-xs text-brand-gray mb-6">
          {mode === 'signin' && 'Unlock structured JEE & NEET educational channels'}
          {mode === 'signup' && 'Join the premium platform for medical and engineering prep'}
          {mode === 'forgot' && 'Provide your registered email address to secure your link'}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-lg font-mono">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg font-mono">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Candidate Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-brand-black border border-brand-border focus:border-brand-accent rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Join As</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-brand-black border border-brand-border focus:border-brand-accent rounded-lg py-2.5 px-3 text-sm text-brand-accent outline-none"
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
                    className="w-full bg-brand-black border border-brand-border focus:border-brand-accent rounded-lg py-2.5 px-3 text-sm text-brand-accent outline-none"
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
            <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-brand-black border border-brand-border focus:border-brand-accent rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-mono"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-mono text-brand-gray mb-1.5 font-medium uppercase tracking-wider">Secret Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-brand-gray" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-brand-black border border-brand-border focus:border-brand-accent rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-accent outline-none font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-accent hover:bg-neutral-200 text-brand-black font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 font-sans cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Processing request...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Profile' : 'Send Instructions'}
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
              className="w-full bg-brand-black hover:bg-brand-border border border-brand-border text-brand-accent font-medium py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Account
            </button>

            <button
              onClick={() => {
                enableGuestMode();
                onClose();
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
              <button onClick={() => setMode('signup')} className="hover:text-brand-accent transition-colors underline">
                Need an account? Sign Up instead
              </button>
              <button onClick={() => setMode('forgot')} className="hover:text-brand-accent transition-colors">
                Forgot password? Recover account
              </button>
            </>
          ) : mode === 'signup' ? (
            <button onClick={() => setMode('signin')} className="hover:text-brand-accent transition-colors underline">
              Already have an account? Sign In
            </button>
          ) : (
            <button onClick={() => setMode('signin')} className="hover:text-brand-accent transition-colors flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
