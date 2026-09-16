import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from '../types/database';
import { syncOfflineActivities } from './offline-queue';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isManager: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  savePushToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  isSupervisor: false,
  isManager: false,
  isLoading: true,
  signIn: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
  savePushToken: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        const p = data as Profile;
        if (!p.is_active) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          return null;
        }
        setProfile(p);
        return p;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
    return null;
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
        // Sync any pending offline activities
        syncOfflineActivities();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        syncOfflineActivities();
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const p = await fetchProfile(data.user.id);
        if (p && !p.is_active) {
          return { error: 'Your employee account is inactive. Please contact an administrator.' };
        }
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const savePushToken = async (token: string) => {
    if (user) {
      try {
        await (supabase.from('profiles') as any)
          .update({ expo_push_token: token })
          .eq('id', user.id);
        await fetchProfile(user.id);
      } catch (err) {
        console.error('Failed to save push token:', err);
      }
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isManager = isAdmin || isSupervisor;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isSupervisor,
        isManager,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
        savePushToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
