import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// ================================================================
// TYPES
// ================================================================
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// Convert username to a fake email for Supabase Auth
const toEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/\s+/g, '_')}@noteboard.local`;

// ================================================================
// STORE
// ================================================================
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,   // true until initial session check completes
  authLoading: false,
  error: null,

  // ── INITIALIZE (check existing session on load) ───────────────
  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    // Listen for auth state changes (sign in / out / token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  // ── SIGN UP ───────────────────────────────────────────────────
  signUp: async (username, password) => {
    set({ authLoading: true, error: null });
    const email = toEmail(username);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        // Skip email confirmation for easier dev UX
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      set({ error: error.message, authLoading: false });
      return;
    }

    set({
      session: data.session,
      user: data.user,
      authLoading: false,
    });
  },

  // ── SIGN IN ───────────────────────────────────────────────────
  signIn: async (username, password) => {
    set({ authLoading: true, error: null });
    const email = toEmail(username);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Make error messages more user-friendly
      const msg = error.message.includes('Invalid login')
        ? 'Incorrect username or password.'
        : error.message;
      set({ error: msg, authLoading: false });
      return;
    }

    set({
      session: data.session,
      user: data.user,
      authLoading: false,
    });
  },

  // ── SIGN OUT ──────────────────────────────────────────────────
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  clearError: () => set({ error: null }),
}));
