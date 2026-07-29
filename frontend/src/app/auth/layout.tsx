import type { Metadata } from 'next';
import AuthLayout from '@/components/auth/AuthLayout';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your INTERLUDE account',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
