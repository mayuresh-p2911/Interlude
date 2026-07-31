'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
      toast.success('Welcome back! 🎬');
      router.push('/home');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password';
      toast.error(message);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
        <p className="text-text-secondary">Sign in to continue watching together</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-2">
            Email address
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="login-remember"
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-surface-2 accent-blue-electric"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-electric hover:text-blue-ice transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <motion.button
          type="submit"
          id="login-submit"
          disabled={isLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      <p className="mt-8 text-center text-text-secondary text-sm">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-blue-electric hover:text-blue-ice transition-colors font-medium">
          Create one free
        </Link>
      </p>
    </div>
  );
}
