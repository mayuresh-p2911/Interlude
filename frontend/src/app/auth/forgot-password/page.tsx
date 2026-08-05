'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Password reset link sent to your email');
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const rawMessage = responseData?.message;
      const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      setEmailError(message ?? 'No account linked to this email');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-royal to-blue-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-blue-glow">
          <EnvelopeIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Check your email</h1>
        <p className="text-text-secondary mb-8">
          If an account exists for <strong className="text-white">{email}</strong>, we've sent a password reset link.
        </p>
        <Link href="/auth/login" className="btn-primary inline-block">
          Back to Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Reset your password</h1>
        <p className="text-text-secondary">We'll send a reset link to your email</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-text-secondary mb-2">
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            className={`input-field ${
              emailError ? 'border-red-500/80 focus:border-red-500 ring-2 ring-red-500/20' : ''
            }`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            required
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1">
              ⚠️ {emailError}
            </p>
          )}
        </div>

        <motion.button
          type="submit"
          id="forgot-submit"
          disabled={isLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full py-4 disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </motion.button>
      </form>

      <p className="mt-6 text-center text-text-secondary text-sm">
        Remember your password?{' '}
        <Link href="/auth/login" className="text-blue-electric hover:text-blue-ice transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
