import { createClient } from '@supabase/supabase-js'

// Temporarily hardcoded values to get the app working
const supabaseUrl = 'https://dvvkxsppnnquhfwwbrgh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'

console.log('Using hardcoded Supabase credentials')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Test the connection immediately with a simple health check
console.log('Testing Supabase connection...')

// First, try to access the Supabase API directly
fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/', {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(response => {
  console.log('Direct API test response status:', response.status)
  console.log('Direct API test response headers:', response.headers)
  if (!response.ok) {
    console.error('Direct API test failed:', response.status, response.statusText)
  }
  return response.text()
})
.then(text => {
  console.log('Direct API test response body:', text.substring(0, 200))
})
.catch(err => {
  console.error('Direct API test failed:', err)
})

// Test direct table access with simple queries
console.log('Testing direct table access...')

// Test posts table directly
fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/posts?select=id&limit=1', {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(response => {
  console.log('Posts table direct test status:', response.status)
  return response.json()
})
.then(data => {
  console.log('Posts table direct test result:', data)
})
.catch(err => {
  console.error('Posts table direct test failed:', err)
})

// Test topics table directly
fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/topics?select=id&limit=1', {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(response => {
  console.log('Topics table direct test status:', response.status)
  return response.json()
})
.then(data => {
  console.log('Topics table direct test result:', data)
})
.catch(err => {
  console.error('Topics table direct test failed:', err)
})

// Then try the Supabase client with a simple query
console.log('Testing posts table existence...')
supabase.from('posts').select('id').limit(1).then(({ data, error }) => {
  console.log('Posts table test:', { data, error })
  if (error) {
    console.error('Posts table error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
  }
}).catch(err => {
  console.error('Posts table test failed:', err)
})

// Database types
export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  reputation: number
  created_at: string
  updated_at: string
}

export interface Topic {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
}

export interface Post {
  id: string
  title: string
  description: string
  images?: string[]
  topic_id: string
  author_id: string
  created_at: string
  updated_at: string
  vote_score: number
  fake_votes: number
  true_votes: number
  neutral_votes: number
  comments_count: number
  topic?: Topic
  author?: User
}

export interface Comment {
  id: string
  content: string
  post_id: string
  author_id: string
  parent_id?: string
  created_at: string
  updated_at: string
  author?: User
  replies?: Comment[]
}

export interface Vote {
  id: string
  post_id: string
  user_id: string
  vote_type: 'fake' | 'true' | 'neutral'
  created_at: string
}
