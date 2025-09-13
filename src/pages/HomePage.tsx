import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Post, Topic } from '../lib/supabase'
import { TopicColumn } from '../components/TopicColumn'
import { SearchFilters } from '../components/SearchFilters'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'

export const HomePage: React.FC = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'newest' | 'trending' | 'controversial'>('newest')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Handle topic filtering from URL params
  useEffect(() => {
    const topicParam = searchParams.get('topic')
    if (topicParam) {
      setSelectedTopic(topicParam)
    }
  }, [searchParams])

  useEffect(() => {
    // Test basic Supabase connection first
    testSupabaseConnection()
    fetchPosts()
    fetchTopics()
  }, [sortBy, selectedTopic, searchQuery])

  const testSupabaseConnection = async () => {
    try {
      console.log('🔍 Testing basic Supabase connection...')
      console.log('🔍 Supabase URL:', supabase.supabaseUrl)
      console.log('🔍 Supabase Key (first 20 chars):', supabase.supabaseKey?.substring(0, 20) + '...')
      
      // Test with a very simple query that should always work
      console.log('🔍 Testing with information_schema...')
      
      // Add a timeout to this test too
      const testPromise = supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5)
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout after 10 seconds')), 10000)
      )
      
      const { data, error } = await Promise.race([testPromise, timeoutPromise]) as any
      
      console.log('🔍 Information schema result:', { data, error })
      
      if (error) {
        console.error('❌ Information schema error:', error)
        if (error.message?.includes('timeout')) {
          console.error('❌ Connection test timed out - this suggests a network or configuration issue')
        }
      } else {
        console.log('✅ Supabase connection working!')
        console.log('🔍 Available tables:', data?.map(t => t.table_name))
        
        // Now test direct table access
        console.log('🔍 Testing direct posts table access...')
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, title')
          .limit(1)
        
        console.log('🔍 Direct posts test:', { data: postsData, error: postsError })
        
        if (postsError) {
          console.error('❌ Direct posts error:', postsError)
        } else {
          console.log('✅ Direct posts access working!')
        }
      }
    } catch (err) {
      console.error('❌ Supabase connection test failed:', err)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching posts using direct API...')
      
      // Use direct API calls instead of Supabase client
      const postsResponse = await fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/posts?select=*&order=created_at.desc', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ'
        }
      })

      const topicsResponse = await fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/topics?select=*', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ'
        }
      })

      const usersResponse = await fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/users?select=*', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ'
        }
      })

      console.log('🔍 Posts response status:', postsResponse.status)
      console.log('🔍 Topics response status:', topicsResponse.status)
      console.log('🔍 Users response status:', usersResponse.status)

      if (!postsResponse.ok) {
        throw new Error(`Posts API error: ${postsResponse.status}`)
      }

      const postsData = await postsResponse.json()
      const topicsData = await topicsResponse.json()
      const usersData = await usersResponse.json()

      console.log('🔍 Posts data:', postsData.length, 'posts')
      console.log('🔍 Topics data:', topicsData.length, 'topics')
      console.log('🔍 Users data:', usersData.length, 'users')

      // Combine the data manually
      const postsWithRelations = postsData?.map(post => ({
        ...post,
        topic: topicsData?.find(topic => topic.id === post.topic_id),
        author: usersData?.find(user => user.id === post.author_id)
      })) || []

      console.log('🔍 Combined posts count:', postsWithRelations.length)

      // Apply filters
      let filteredPosts = postsWithRelations

      if (selectedTopic) {
        filteredPosts = filteredPosts.filter(post => post.topic_id === selectedTopic)
        console.log('🔍 Filtered by topic:', selectedTopic, 'count:', filteredPosts.length)
      }

      if (searchQuery) {
        filteredPosts = filteredPosts.filter(post => 
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        console.log('🔍 Filtered by search:', searchQuery, 'count:', filteredPosts.length)
      }

      // Apply sorting
      let sortedPosts = filteredPosts

      if (sortBy === 'trending') {
        sortedPosts = sortedPosts.sort((a, b) => b.vote_score - a.vote_score)
      } else if (sortBy === 'controversial') {
        sortedPosts = sortedPosts.sort((a, b) => {
          const aControversy = Math.abs(a.true_votes - a.fake_votes)
          const bControversy = Math.abs(b.true_votes - b.fake_votes)
          return bControversy - aControversy
        })
      }

      console.log('🔍 Final posts count:', sortedPosts.length)
      setPosts(sortedPosts)
    } catch (error) {
      console.error('❌ Error fetching posts:', error)
      setPosts([])
    } finally {
      setLoading(false)
      console.log('🔍 Loading set to false')
    }
  }

  const fetchTopics = async () => {
    try {
      console.log('🔍 Fetching topics using direct API...')
      
      const response = await fetch('https://aaiqklqnzamkpxudrqhz.supabase.co/rest/v1/topics?select=*&order=name', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXFrbHFuemFta3B4dWRycWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQzOTMsImV4cCI6MjA3MzM2MDM5M30.asM5Sxs_2ow6lFokPmZ8Lmh1ici7TK3aLf4PHzNkTPQ'
        }
      })

      console.log('🔍 Topics response status:', response.status)

      if (!response.ok) {
        throw new Error(`Topics API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Topics data:', data.length, 'topics')
      
      setTopics(data || [])
    } catch (error) {
      console.error('❌ Error fetching topics:', error)
      setTopics([])
    }
  }

  const handleTopicChange = (topicId: string | null) => {
    setSelectedTopic(topicId)
    if (topicId) {
      setSearchParams({ topic: topicId })
    } else {
      setSearchParams({})
    }
  }

  // Group posts by topic for the column layout
  const getPostsByTopic = (topicId: string) => {
    const topicPosts = posts.filter(post => post.topic_id === topicId)
    console.log(`🔍 Posts for topic ${topicId}:`, topicPosts.length)
    return topicPosts
  }

  // Create column configurations similar to the original design
  const columnConfigs = topics.slice(0, 4).map((topic, index) => {
    const topicPosts = getPostsByTopic(topic.id)
    console.log(`🔍 Column ${index + 1} (${topic.name}):`, topicPosts.length, 'posts')
    
    return {
      id: index + 1,
      subColumns: [
        { 
          height: "100%", 
          topic: topic.name, 
          newsItems: topicPosts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            images: post.images || [],
            author: post.author?.full_name || 'Anonymous',
            createdAt: post.created_at,
            trueVotes: post.true_votes,
            fakeVotes: post.fake_votes,
            neutralVotes: post.neutral_votes,
            commentsCount: post.comments_count,
            voteScore: post.vote_score
          }))
        }
      ]
    }
  })

  console.log('🔍 Total posts:', posts.length)
  console.log('🔍 Total topics:', topics.length)
  console.log('🔍 Column configs:', columnConfigs.length)

  // If filtering by topic, show only that topic's posts in the first column
  const filteredColumnConfigs = selectedTopic ? 
    [{
      id: 1,
      subColumns: [
        { 
          height: "100%", 
          topic: topics.find(t => t.id === selectedTopic)?.name || 'Filtered Results', 
          newsItems: posts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            images: post.images || [],
            author: post.author?.full_name || 'Anonymous',
            createdAt: post.created_at,
            trueVotes: post.true_votes,
            fakeVotes: post.fake_votes,
            neutralVotes: post.neutral_votes,
            commentsCount: post.comments_count,
            voteScore: post.vote_score
          }))
        }
      ]
    }] : columnConfigs

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journalist News Verification</h1>
            <p className="text-gray-600 mt-1">Share, verify, and discuss news stories</p>
          </div>
          {user && (
            <Link to="/create">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Post
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <SearchFilters
          topics={topics}
          selectedTopic={selectedTopic}
          onTopicChange={handleTopicChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {/* Main Content - Original Column Layout */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to share a news story!'}
              </p>
              {user && (
                <Link to="/create">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Post
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className={`h-full grid gap-6 p-6 ${selectedTopic ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {filteredColumnConfigs.map((column) => (
              <div key={column.id} className="min-w-0 h-full">
                <TopicColumn 
                  columnId={column.id}
                  subColumns={column.subColumns}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
