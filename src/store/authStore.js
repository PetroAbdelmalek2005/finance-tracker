import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set) => ({
  user:    null,
  session: null,
  loading: true,

  initialize() {
    // Register listener BEFORE getSession to avoid a race condition
    // where a session exists but the event fires before the listener is attached.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({
          session,
          user:    session?.user ?? null,
          loading: false,
        })
      }
    )

    // Eagerly resolve the loading state from localStorage cache.
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user:    session?.user ?? null,
        loading: false,
      })
    })

    return { unsubscribe: () => subscription.unsubscribe() }
  },

  async signOut() {
    await supabase.auth.signOut()
    // onAuthStateChange fires and clears user/session automatically.
  },
}))
