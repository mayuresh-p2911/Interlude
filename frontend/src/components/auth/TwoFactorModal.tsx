'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeIcon, KeyIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface TwoFactorModalProps {
  isOpen: boolean;
  tempToken: string;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TwoFactorModal({
  isOpen,
  tempToken,
  email,
  onSuccess,
  onCancel,
}: TwoFactorModalProps) {
  const { verify2FA } = useAuthStore();
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [currentTempToken, setCurrentTempToken] = useState(tempToken);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep currentTempToken in sync when tempToken prop changes
  useEffect(() => {
    setCurrentTempToken(tempToken);
  }, [tempToken]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Focus first input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 characters are filled
    if (char && index === 5 && newCode.every((c) => c !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pasted.length === 6) {
      const chars = pasted.split('');
      setCode(chars);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const finalCode = fullCode || code.join('');
    if (finalCode.length < 6) {
      toast.error('Please enter all 6 characters of your 2FA code');
      return;
    }

    setIsSubmitting(true);
    try {
      await verify2FA(currentTempToken, finalCode);
      toast.success('Security code verified! Welcome back 🎬');
      onSuccess();
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string; tempToken?: string } } })?.response?.data;
      if (respData?.tempToken) {
        setCurrentTempToken(respData.tempToken);
      }
      const message = respData?.message ?? 'Invalid or expired 2FA code';
      toast.error(message);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await authApi.resend2FA({ tempToken: currentTempToken });
      if (res.data?.tempToken) {
        setCurrentTempToken(res.data.tempToken);
      }
      toast.success('A new 2FA code has been sent to your email');
      setResendCooldown(60);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to resend 2FA code';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-surface-1 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden"
        >
          {/* Top subtle blue light bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-electric via-blue-ice to-blue-electric" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-electric/15 border border-blue-electric/30 flex items-center justify-center text-blue-electric shadow-lg shadow-blue-electric/10">
              <EnvelopeIcon className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Check your email</h2>
            <p className="text-sm text-text-secondary">
              We sent a 6-character code (mixed letters & numbers) to:
            </p>
            <p className="text-sm font-semibold text-blue-ice mt-1 bg-surface-2/60 py-1.5 px-3 rounded-lg inline-block border border-white/5">
              {email}
            </p>
          </div>

          <div className="mb-8">
            <label className="block text-xs font-semibold text-text-muted text-center uppercase tracking-wider mb-3">
              Enter 6-Digit Alphanumeric Code
            </label>
            <div className="flex justify-between gap-2 sm:gap-3">
              {code.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-mono font-black uppercase bg-surface-2 border border-white/10 rounded-xl focus:border-blue-electric focus:ring-2 focus:ring-blue-electric/20 text-white outline-none transition-all"
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <motion.button
              type="button"
              onClick={() => handleVerify()}
              disabled={isSubmitting || code.some((c) => c === '')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Verify & Continue
                </span>
              )}
            </motion.button>

            <div className="flex items-center justify-between text-xs text-text-muted pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="hover:text-text-secondary transition-colors"
              >
                Back to Sign In
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-blue-electric hover:text-blue-ice disabled:text-text-muted font-medium transition-colors flex items-center gap-1"
              >
                {isResending ? (
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Resend 2FA code'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
