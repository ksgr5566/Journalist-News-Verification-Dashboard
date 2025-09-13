import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Post } from '../lib/supabase'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { MessageCircle, ThumbsUp, ThumbsDown, Minus, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PostCardProps {
  post: Post
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [userVote, setUserVote] = useState<'fake' | 'true' | 'neutral' | null>(null)

  const handleVote = async (voteType: 'fake' | 'true' | 'neutral') => {
    if (!user || isVoting) return

    try {
      setIsVoting(true)

      // Remove existing vote if user clicks the same vote type
      if (userVote === voteType) {
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        setUserVote(null)
        // Update local vote counts
        updateLocalVoteCounts(voteType, -1)
      } else {
        // Upsert vote
        const { error: upsertError } = await supabase
          .from('votes')
          .upsert({
            post_id: post.id,
            user_id: user.id,
            vote_type: voteType
          })

        if (upsertError) throw upsertError

        // Update local vote counts
        if (userVote) {
          updateLocalVoteCounts(userVote, -1)
        }
        updateLocalVoteCounts(voteType, 1)
        setUserVote(voteType)
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const updateLocalVoteCounts = (voteType: 'fake' | 'true' | 'neutral', delta: number) => {
    // This would typically be handled by a state management solution
    // For now, we'll just log the action
    console.log(`Updated ${voteType} votes by ${delta}`)
  }

  const getVoteButtonStyle = (voteType: 'fake' | 'true' | 'neutral') => {
    const isActive = userVote === voteType
    const baseStyle = "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors"
    
    if (voteType === 'true') {
      return `${baseStyle} ${isActive ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-green-50'}`
    } else if (voteType === 'fake') {
      return `${baseStyle} ${isActive ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-red-50'}`
    } else {
      return `${baseStyle} ${isActive ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-100 text-gray-700 hover:bg-yellow-50'}`
    }
  }

  const getVoteCount = (voteType: 'fake' | 'true' | 'neutral') => {
    switch (voteType) {
      case 'true': return post.true_votes
      case 'fake': return post.fake_votes
      case 'neutral': return post.neutral_votes
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.author?.avatar_url} />
            <AvatarFallback>
              {post.author?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">{post.author?.full_name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge 
          style={{ backgroundColor: post.topic?.color || '#6B7280' }}
          className="text-white"
        >
          {post.topic?.name}
        </Badge>
      </div>

      {/* Content */}
      <Link to={`/post/${post.id}`} className="block group">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h2>
        <p className="text-gray-700 mb-4 line-clamp-3">
          {post.description}
        </p>
      </Link>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            {post.images.slice(0, 4).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Post image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('true')}
            disabled={!user || isVoting}
            className={getVoteButtonStyle('true')}
          >
            <ThumbsUp className="w-4 h-4" />
            {getVoteCount('true')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('neutral')}
            disabled={!user || isVoting}
            className={getVoteButtonStyle('neutral')}
          >
            <Minus className="w-4 h-4" />
            {getVoteCount('neutral')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('fake')}
            disabled={!user || isVoting}
            className={getVoteButtonStyle('fake')}
          >
            <ThumbsDown className="w-4 h-4" />
            {getVoteCount('fake')}
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link 
            to={`/post/${post.id}`}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comments_count} comments
          </Link>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {Math.floor(Math.random() * 1000)} views
          </div>
        </div>
      </div>
    </div>
  )
}
