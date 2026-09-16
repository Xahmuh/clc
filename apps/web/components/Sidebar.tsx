'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import logoImg from '@/public/logo.webp';
import { LayoutGrid, Users, ShieldCheck, LogOut, Building, LayoutDashboard, FileText, Settings, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

interface SidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onNavigate, onClose, className = '' }: SidebarProps) {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { language, toggleLanguage, t, formatRole, isRTL } = useLanguage();

  const navItems = [
    {
      name: t('nav_dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: t('nav_leads'),
      href: '/leads',
      icon: LayoutGrid,
      show: true,
    },
    {
      name: t('nav_customers'),
      href: '/customers',
      icon: Users,
      show: true,
    },
    {
      name: t('nav_reports'),
      href: '/reports',
      icon: FileText,
      show: true,
    },
    {
      name: t('nav_team'),
      href: '/team',
      icon: ShieldCheck,
      show: isAdmin,
    },
    {
      name: t('nav_settings'),
      href: '/settings',
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <aside className={`w-64 h-full bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 flex flex-col shrink-0 select-none ${className}`}>
      {/* Brand Header */}
      <div className="h-[84px] px-4 flex items-center justify-between border-b border-gray-200">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center justify-center flex-1"
        >
          <Image
            src={logoImg}
            alt="Construction Land For Contracting Co. (CLC)"
            priority
            className="h-[52px] w-auto max-w-[200px] object-contain"
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-ink-900 rounded-button transition-colors md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-900 text-white'
                    : 'text-gray-500 hover:text-ink-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* User & Sign Out Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {/* Language Switcher Button */}
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-button text-xs font-semibold text-ink-900 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-gray-500" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-gray-400">
            {language === 'ar' ? 'EN' : 'عربي'}
          </span>
        </button>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-cream-100 border border-gray-200 flex items-center justify-center text-ink-900 text-xs font-semibold">
                {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              {/* Online status green dot */}
              <span className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} h-2.5 w-2.5 rounded-full bg-online ring-2 ring-white`} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-900 truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-[11px] text-gray-500 capitalize truncate">
                {profile?.role ? formatRole(profile.role) : t('role_employee')}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            title={t('auth_sign_out')}
            className="p-1.5 text-gray-400 hover:text-ink-900 hover:bg-gray-100 rounded-button transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
