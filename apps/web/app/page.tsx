'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import clcLogo from '@/public/clc-logo.png';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-5">
        <Image
          src={clcLogo}
          alt="CLC Logo"
          priority
          className="h-24 w-auto object-contain animate-pulse"
        />
        <p className="text-xs text-gray-400 font-medium tracking-wide">Loading CLC CRM...</p>
      </div>
    </div>
  );
}
