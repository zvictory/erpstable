'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessType } from '@/contexts/BusinessContext';

export function SetupRedirect() {
  const router = useRouter();
  const { setupCompleted, isLoading } = useBusinessType();

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading && !setupCompleted) {
      router.push('/setup');
    }
  }, [setupCompleted, isLoading, router]);

  // Show loading state while checking setup status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // If not setup completed, router.push will handle the redirect
  // This component just ensures the redirect happens
  return null;
}
