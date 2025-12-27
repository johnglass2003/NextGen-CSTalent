/**
 * Auth Context
 * Manages authentication state and provides user data throughout the app
 * Includes DEV MODE bypass for testing (check localStorage first)
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type UserRole = 'student' | 'company' | 'internal';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserRole = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', supabaseUser.id)
        .single();

      if (error || !userData) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: userData.role as UserRole,
      };
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return null;
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    try {
      // Check for dev mode first
      if (typeof window !== 'undefined') {
        const devUser = localStorage.getItem('dev_user');
        if (devUser) {
          console.log('🔧 DEV MODE: Refreshing fake auth user');
          setUser(JSON.parse(devUser));
          return;
        }
      }

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        const userWithRole = await fetchUserRole(supabaseUser);
        setUser(userWithRole);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  }, [supabase, fetchUserRole]);

  useEffect(() => {
    // Check initial session
    const initializeAuth = async () => {
      try {
        // ======== DEV MODE CHECK ========
        // Check localStorage for dev_user first (bypasses real auth)
        if (typeof window !== 'undefined') {
          const devUser = localStorage.getItem('dev_user');
          if (devUser) {
            console.log('🔧 DEV MODE: Using fake auth from localStorage');
            setUser(JSON.parse(devUser));
            setLoading(false);
            return;
          }
        }
        // ======== END DEV MODE CHECK ========

        // Normal auth flow
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userWithRole = await fetchUserRole(session.user);
          setUser(userWithRole);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (only for real auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if in dev mode
        if (typeof window !== 'undefined' && localStorage.getItem('dev_user')) {
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const userWithRole = await fetchUserRole(session.user);
          setUser(userWithRole);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const userWithRole = await fetchUserRole(session.user);
          setUser(userWithRole);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserRole]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear dev mode if present
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dev_user');
      }
      
      // Also clear real auth
      await supabase.auth.signOut();
      setUser(null);
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
