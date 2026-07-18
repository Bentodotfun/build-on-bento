'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/lib/state';
import { Sparkles, Wallet, Award, Users, LayoutDashboard, Sun, Moon } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const { userXp, theme, toggleTheme } = useAppState();

  const isRooms = pathname.includes('/rooms');

  // Synchronize HTML class on load and theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-[#15181f] bg-white/90 dark:bg-[#000000]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fa5025] text-white shadow-md shadow-[#fa5025]/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 dark:text-white">Predicto</span>
              <span className="ml-1.5 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
                PredictGPT
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isRooms 
                  ? 'text-[#fa5025] bg-[#fa5025]/5 dark:bg-[#fa5025]/10 border border-[#fa5025]/20 dark:border-[#fa5025]/35' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Markets</span>
            </Link>
            <Link
              href="/rooms"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isRooms 
                  ? 'text-[#fa5025] bg-[#fa5025]/5 dark:bg-[#fa5025]/10 border border-[#fa5025]/20 dark:border-[#fa5025]/35' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Private Rooms</span>
            </Link>
          </nav>
        </div>

        {/* User Balance, XP & Theme Toggles */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.02] p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          {/* XP Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-1.5 text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
            <Award className="h-4 w-4" />
            <span>{userXp.toLocaleString()} XP</span>
          </div>

          {/* Connected Wallet Box */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-[#202430] bg-slate-50 dark:bg-white/[0.02] px-3.5 py-1.5 text-xs">
            <Wallet className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <div className="text-left hidden md:block">
              <p className="text-[9px] text-slate-400 dark:text-white/40 leading-none">Account</p>
              <p className="font-mono font-bold text-slate-800 dark:text-white/90 leading-normal mt-0.5">0x7d9...4a2b</p>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />
            <div className="text-right">
              <p className="text-[9px] text-slate-400 dark:text-white/40 leading-none">Balance</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 leading-normal mt-0.5">1,250 USDC</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav tabs */}
      <div className="md:hidden flex border-t border-slate-200 dark:border-[#15181f] bg-slate-50 dark:bg-[#090a0f]">
        <Link 
          href="/" 
          className={`flex-1 text-center py-2.5 text-xs font-bold ${!isRooms ? 'text-[#fa5025] dark:text-[#fa5025] border-b-2 border-[#fa5025] dark:border-[#fa5025]' : 'text-slate-500'}`}
        >
          Markets
        </Link>
        <Link 
          href="/rooms" 
          className={`flex-1 text-center py-2.5 text-xs font-bold ${isRooms ? 'text-[#fa5025] dark:text-[#fa5025] border-b-2 border-[#fa5025] dark:border-[#fa5025]' : 'text-slate-500'}`}
        >
          Private Rooms
        </Link>
      </div>
    </header>
  );
}
