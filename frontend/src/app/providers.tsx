'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#F9FAFB',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#3B82F6', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  );
}
