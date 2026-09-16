'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import clcLogo from '@/public/clc-logo.png';
import logoImg from '@/public/logo.webp';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Menu, X, Globe } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { language, toggleLanguage, isRTL } = useLanguage();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <Image
          src={clcLogo}
          alt="CLC Logo"
          priority
          className="h-24 w-auto object-contain animate-pulse"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden flex-col md:flex-row">
      {/* 1. Desktop Persistent Sidebar (md and above) */}
      <div className="hidden md:flex shrink-0 h-screen">
        <Sidebar />
      </div>

      {/* 2. Mobile Top Navigation Header (< md) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-ink-900 hover:bg-gray-100 rounded-button transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center">
          <Image
            src={logoImg}
            alt="CLC Logo"
            priority
            className="h-9 w-auto max-w-[150px] object-contain"
          />
        </Link>

        {/* Mobile Language Switcher */}
        <button
          onClick={toggleLanguage}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-button text-xs font-semibold text-ink-900 hover:bg-gray-100 transition-colors"
        >
          <Globe className="h-3.5 w-3.5 text-gray-500" />
          <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
        </button>
      </header>

      {/* 3. Mobile Drawer Navigation Overlay & Container (< md) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            className={`relative z-10 w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
              isRTL ? 'mr-0' : 'ml-0'
            }`}
          >
            <Sidebar
              onNavigate={() => setIsMobileMenuOpen(false)}
              onClose={() => setIsMobileMenuOpen(false)}
              className="w-full border-none"
            />
          </div>
        </div>
      )}

      {/* 4. Main Viewport Scrollable Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
