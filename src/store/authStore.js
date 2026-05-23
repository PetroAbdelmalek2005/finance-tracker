import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set) => ({
  user:      null,
  session:   null,
  loading:   true,
  authEvent: null,

  initialize() {
    // Register listener BEFORE getSession to avoid a race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({
          session,
          user:      session?.user ?? null,
          loading:   false,
          authEvent: event,
        })
      }
    )

    // Eagerly resolve loading state from localStorage cache.
    supabase.auth.getSession().then(({ data: { session } }) => {
      set((state) => ({
        session,
        user:    session?.user ?? null,
        loading: false,
        // Don't overwrite authEvent if the listener already set it
        authEvent: state.authEvent,
      }))
    })

    return { unsubscribe: () => subscription.unsubscribe() }
  },

  async signOut() {
    await supabase.auth.signOut()
  },
}))
