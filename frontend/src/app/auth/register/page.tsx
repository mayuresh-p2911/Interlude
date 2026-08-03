'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import CaptchaWidget from '@/components/auth/CaptchaWidget';
import TwoFactorModal from '@/components/auth/TwoFactorModal';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // CAPTCHA State
  const [captchaData, setCaptchaData] = useState<{ captchaToken: string; captchaInput: string }>({
    captchaToken: '',
    captchaInput: '',
  });
  const [captchaError, setCaptchaError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError('');

    if (typeof age !== 'number' || age < 18) {
      toast.error('You must be at least 18 years old to register');
      return;
    }
    if (!passwordRequirements.every((r) => r.test(password))) {
      toast.error('Please meet all password requirements');
      return;
    }
    if (!captchaData.captchaInput) {
      setCaptchaError('Please enter the CAPTCHA characters');
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(
        username,
        email,
        password,
        Number(age),
        captchaData.captchaToken,
        captchaData.captchaInput,
      );

      if (res?.requires2FA && res.tempToken) {
        setTempToken(res.tempToken);
        setShow2FAModal(true);
        toast.success('Security verification code sent to your email! 📩');
      } else {
        toast.success('Account created! Welcome to INTERLUDE 🎬');
        window.location.href = '/home';
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Registration failed. Please try again.';

      if (message.toLowerCase().includes('captcha')) {
        setCaptchaError(message);
        setRefreshTrigger((prev) => prev + 1);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
        <p className="text-text-secondary">Join INTERLUDE — free forever</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="register-username" className="block text-sm font-medium text-text-secondary mb-2">
            Username
          </label>
          <input
            id="register-username"
            type="text"
            className="input-field"
            placeholder="coolcineaste"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="^[a-zA-Z0-9_]+$"
            autoComplete="username"
          />
          <p className="mt-1 text-xs text-text-muted">Letters, numbers, and underscores only</p>
        </div>

        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-text-secondary mb-2">
            Email address
          </label>
          <input
            id="register-email"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="register-age" className="block text-sm font-medium text-text-secondary mb-2">
            Age <span className="text-xs text-blue-ice font-normal">(18+ required)</span>
          </label>
          <input
            id="register-age"
            type="number"
            min={18}
            max={120}
            className="input-field"
            placeholder="21"
            value={age}
            onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
            required
          />
          <p className="mt-1 text-xs text-text-muted">You must be at least 18 years old to join INTERLUDE</p>
        </div>

        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-text-secondary mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-1.5"
            >
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2">
                  <CheckCircleIcon
                    className={`w-4 h-4 transition-colors ${
                      req.test(password) ? 'text-blue-electric' : 'text-text-muted'
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors ${
                      req.test(password) ? 'text-text-secondary' : 'text-text-muted'
                    }`}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Human Verification (Dancing CAPTCHA) */}
        <CaptchaWidget
          onCaptchaChange={(data) => setCaptchaData(data)}
          refreshTrigger={refreshTrigger}
          error={captchaError}
        />

        <motion.button
          type="submit"
          id="register-submit"
          disabled={isSubmitting || isLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting || isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </motion.button>

        <p className="text-center text-xs text-text-muted">
          By creating an account, you agree to our Terms of Service.
        </p>
      </form>

      <p className="mt-6 text-center text-text-secondary text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-blue-electric hover:text-blue-ice transition-colors font-medium">
          Sign in
        </Link>
      </p>

      {/* 2FA Verification Modal */}
      <TwoFactorModal
        isOpen={show2FAModal}
        tempToken={tempToken}
        email={email}
        onSuccess={() => {
          window.location.href = '/home';
        }}
        onCancel={() => setShow2FAModal(false)}
      />
    </div>
  );
}
