import { createClient } from '@supabase/supabase-js'

// Temporarily hardcoded values to get the app working
const supabaseUrl = 'https://aaiqklqnzamkpxudrqhz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ'

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
fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/', {
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
fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/posts?select=id&limit=1', {
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
fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/topics?select=id&limit=1', {
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
  // Sentiment analysis fields
  overall_sentiment_score?: number
  overall_sentiment_label?: 'true' | 'fake' | 'neutral'
  overall_sentiment_confidence?: number
  sentiment_analyzed_at?: string
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
  // Sentiment analysis fields
  sentiment_score?: number
  sentiment_label?: 'supporting' | 'claiming_fake' | 'neutral'
  sentiment_confidence?: number
  analyzed_at?: string
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

// Sentiment analysis functions
export const analyzeSentiment = async (text: string, type: 'comment' | 'post') => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ text, type }),
    })

    if (!response.ok) {
      throw new Error(`Sentiment analysis failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing sentiment:', error)
    // Return default neutral sentiment if analysis fails
    return {
      sentiment_score: 0,
      sentiment_label: 'neutral',
      sentiment_confidence: 0
    }
  }
}

// Function to analyze comment sentiment and update database
export const analyzeCommentSentiment = async (commentId: string, content: string) => {
  try {
    console.log('Starting sentiment analysis for comment:', commentId, 'content:', content)
    const sentimentResult = await analyzeSentiment(content, 'comment')
    console.log('Sentiment analysis result:', sentimentResult)
    
    const updateData = {
      sentiment_score: sentimentResult.sentiment_score,
      sentiment_label: sentimentResult.sentiment_label,
      sentiment_confidence: sentimentResult.sentiment_confidence,
      analyzed_at: new Date().toISOString()
    }
    console.log('Updating comment with data:', updateData)
    
    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()

    if (error) {
      console.error('Error updating comment sentiment:', error)
      return false
    }

    console.log('Successfully updated comment sentiment:', data)
    return true
  } catch (error) {
    console.error('Error analyzing comment sentiment:', error)
    return false
  }
}

// Function to analyze post sentiment and update database
export const analyzePostSentiment = async (postId: string, title: string, description: string) => {
  try {
    const combinedText = `${title} ${description}`
    const sentimentResult = await analyzeSentiment(combinedText, 'post')
    
    const { error } = await supabase
      .from('posts')
      .update({
        overall_sentiment_score: sentimentResult.sentiment_score,
        overall_sentiment_label: sentimentResult.sentiment_label,
        overall_sentiment_confidence: sentimentResult.sentiment_confidence,
        sentiment_analyzed_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (error) {
      console.error('Error updating post sentiment:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error analyzing post sentiment:', error)
    return false
  }
}
