import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'viewer' | 'editor' | 'admin'
  bio: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role: 'viewer' | 'editor' | 'admin') => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  hasRole: (role: 'viewer' | 'editor' | 'admin') => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Defer profile fetch to avoid blocking auth state change
          setTimeout(() => {
            fetchProfile(session.user.id)
          }, 0)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id)
        }, 0)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string, role: 'viewer' | 'editor' | 'admin') => {
    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        })
        return { error }
      }

      toast({
        title: "Sign up successful",
        description: "Please check your email to confirm your account."
      })

      return { error: null }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      })
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        })
        return { error }
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      })

      return { error: null }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      })
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully."
        })
      }
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const hasRole = (role: 'viewer' | 'editor' | 'admin') => {
    if (!profile) return false
    
    if (role === 'viewer') return true // All roles have viewer access
    if (role === 'editor') return profile.role === 'editor' || profile.role === 'admin'
    if (role === 'admin') return profile.role === 'admin'
    
    return false
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    hasRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}