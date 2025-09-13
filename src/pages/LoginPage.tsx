import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
// ⛔️ Temporarily comment out shadcn Button to rule out styling/component issues
// import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Shield } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const clearForm = () => {
    setEmail(''); setPassword(''); setFullName(''); setError(''); setSuccess('')
  }
  const switchMode = () => { setIsSignUp(v => !v); clearForm() }

  const proceed = async () => {
    setError('')
    setSuccess('')

    // common checks
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields'); return
    }

    if (isSignUp) {
      if (!fullName.trim()) { setError('Please fill in all fields'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters long'); return }
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password, fullName)
        console.log('Sign up result:', result)
        if (result?.user) {
          console.log('User created successfully')
          setSuccess('Account created successfully! Welcome to Journalist News Verification.')
          clearForm()
          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/')
          }, 2000)
        }
      } else {
        const result = await signInWithEmail(email, password)
        console.log('Sign in result:', result)
        if (result?.user) {
          console.log('User signed in successfully')
          setSuccess('Welcome back! Redirecting...')
          clearForm()
          // Redirect after 1 second
          setTimeout(() => {
            navigate('/')
          }, 1000)
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      let errorMessage = err?.message || (isSignUp ? 'Failed to sign up' : 'Failed to sign in')
      
      // Handle specific Supabase errors
      if (err?.message?.includes('already registered') || err?.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (err?.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (err?.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Journalist News Verification</h2>
          <p className="text-gray-600">
            {isSignUp ? 'Create your account to get started' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white p-6 sm:p-8 shadow-xl border border-gray-200 rounded-xl">
          {/* prevent native submit — we only act on Proceed click */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full name</Label>
                <Input id="fullName" type="text" placeholder="Enter your full name"
                  value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email address</Label>
              <Input id="email" type="email" placeholder="Enter your email address"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                {isSignUp ? 'Create a Password' : 'Your Password'}
              </Label>
              <Input id="password" type="password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-600 text-sm font-medium">{success}</p>
              </div>
            )}

            {/* ALWAYS-VISIBLE PROCEED (native button, obvious styles) */}
            <button
              type="button"
              onClick={proceed}
              data-testid="proceed-btn"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                background: '#16a34a',
                color: 'white',
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                fontSize: '16px',
              }}
            >
              {loading ? (
                isSignUp ? 'Creating account...' : 'Signing in...'
              ) : (
                isSignUp ? 'Proceed' : 'Sign In'
              )}
            </button>
          </form>

          <div className="text-center space-y-4 mt-8">
            {!isSignUp && (
              <a href="#" className="text-sm text-gray-600 hover:text-gray-800 underline block">
                Forgot your password?
              </a>
            )}
            <div className="text-sm text-gray-600">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button type="button" onClick={switchMode}
                className="text-green-600 hover:text-green-700 underline font-semibold ml-1">
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
