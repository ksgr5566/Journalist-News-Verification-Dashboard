import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  needsEmailVerification: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ needsVerification: boolean; message: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        console.log('Initial session:', session?.user?.email)
        setSupabaseUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('User found in session:', {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at
          })
          console.log('Fetching profile for user ID:', session.user.id)
          await fetchUserProfile(session.user.id)
        } else {
          console.log('No user in session')
          setUser(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setSupabaseUser(session?.user ?? null)
      
      if (session?.user) {
        // Check if user is verified
        if (session.user.email_confirmed_at) {
          console.log('User is verified, fetching profile')
          setNeedsEmailVerification(false)
          await fetchUserProfile(session.user.id)
        } else {
          console.log('User needs email verification')
          setNeedsEmailVerification(true)
          setUser(null)
          setLoading(false)
        }
      } else {
        setUser(null)
        setNeedsEmailVerification(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId)
      // Use direct API call to bypass RLS issues
      const response = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/users?id=eq.${userId}&select=*`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      })

      console.log('User profile fetch response status:', response.status)

      if (!response.ok) {
        console.error('Error fetching user profile:', response.status, response.statusText)
        setUser(null)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log('User profile data:', data)
      
      if (data && data.length > 0) {
        setUser(data[0])
        console.log('User profile loaded successfully')
      } else {
        console.log('No user profile found')
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Sign in response:', { data, error })
      
      if (error) {
        console.error('Supabase auth error:', error)
        throw error
      }
      
      // Manually set the user state if auth state change doesn't fire immediately
      if (data.user) {
        console.log('User signed in successfully:', data.user.email)
        setSupabaseUser(data.user)
        await fetchUserProfile(data.user.id)
      }
      
      return data
    } catch (error: any) {
      console.error('Error signing in with email:', error)
      // Provide more user-friendly error messages
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in.')
      } else if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment before trying again.')
      }
      throw new Error(error.message || 'Failed to sign in. Please try again.')
    }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Attempting to sign up with:', email, fullName)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      console.log('Sign up response:', { data, error })
      
      if (error) {
        console.error('Supabase signup error:', error)
        throw error
      }

      // Check if user needs email verification
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created but needs email verification')
        
        // Create user profile in our users table (but don't log them in)
        try {
          const response = await fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/users', {
            method: 'POST',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName,
              reputation: 0
            })
          })

          if (!response.ok) {
            console.error('Error creating user profile:', response.status, response.statusText)
          } else {
            console.log('User profile created successfully')
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError)
        }

        return {
          needsVerification: true,
          message: 'Please check your email and click the verification link to complete your registration.'
        }
      }

      // If user is already verified (shouldn't happen in normal flow)
      if (data.user && data.user.email_confirmed_at) {
        console.log('User is already verified, logging in')
        setSupabaseUser(data.user)
        await fetchUserProfile(data.user.id)
        return {
          needsVerification: false,
          message: 'Account created and logged in successfully.'
        }
      }

      return {
        needsVerification: true,
        message: 'Please check your email and click the verification link to complete your registration.'
      }
    } catch (error: any) {
      console.error('Error signing up with email:', error)
      // Provide more user-friendly error messages
      if (error.message?.includes('already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.')
      } else if (error.message?.includes('password')) {
        throw new Error('Password should be at least 6 characters long.')
      } else if (error.message?.includes('email')) {
        throw new Error('Please enter a valid email address.')
      }
      throw new Error(error.message || 'Failed to create account. Please try again.')
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setUser(data)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error resending verification email:', error)
      throw error
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    needsEmailVerification,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
