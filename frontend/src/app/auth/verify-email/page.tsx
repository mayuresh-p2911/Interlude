'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        toast.success('Email verified successfully!');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="text-center py-12">
      {status === 'verifying' && (
        <div>
          <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Verifying your email...</h2>
        </div>
      )}

      {status === 'success' && (
        <div>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">Email Verified! 🎬</h2>
          <p className="text-text-secondary mb-6">Your email address has been verified. You can now sign in.</p>
          <Link href="/auth/login" className="btn-primary py-3 px-6 text-sm">
            Sign In Now
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Verification Failed</h2>
          <p className="text-text-secondary mb-6">The verification link is invalid or has expired.</p>
          <Link href="/auth/login" className="btn-ghost py-3 px-6 text-sm">
            Back to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-text-secondary">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
