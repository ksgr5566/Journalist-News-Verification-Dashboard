import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Post, Comment, analyzeCommentSentiment } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { ThumbsUp, ThumbsDown, Minus, MessageCircle, Reply, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const PostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [userVote, setUserVote] = useState<'fake' | 'true' | 'neutral' | null>(null)

  useEffect(() => {
    if (id) {
      fetchPost()
      fetchComments()
    }
  }, [id])

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          topic:topics(*),
          author:users(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setPost(data)

      // Fetch user's vote if logged in
      if (user) {
        const { data: voteData } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .single()

        if (voteData) {
          setUserVote(voteData.vote_type)
        }
      }
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:users(*)
        `)
        .eq('post_id', id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleVote = async (voteType: 'fake' | 'true' | 'neutral') => {
    if (!user || !post) return

    try {
      // Remove existing vote if user clicks the same vote type
      if (userVote === voteType) {
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError
        setUserVote(null)
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
        setUserVote(voteType)
      }

      // Refresh post data to get updated vote counts
      fetchPost()
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !post || !commentText.trim()) return

    try {
      setSubmittingComment(true)

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: commentText.trim(),
          post_id: post.id,
          author_id: user.id
        })
        .select()

      if (error) throw error
      console.log('data', data)
      
      // Analyze sentiment for the new comment and wait for it to complete
      if (data && data[0] && data[0].id) {
        console.log('Calling analyzeCommentSentiment with:', data[0].id, commentText.trim())
        const sentimentSuccess = await analyzeCommentSentiment(data[0].id, commentText.trim())
        console.log('Sentiment analysis completed:', sentimentSuccess)
      } else {
        console.log('No comment data found, skipping sentiment analysis')
      }

      setCommentText('')
      // Only refresh comments after sentiment analysis is complete
      await fetchComments()
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const getVoteBackgroundColor = (post: Post) => {
    const totalVotes = post.true_votes + post.fake_votes + post.neutral_votes
    if (totalVotes === 0) return 'bg-white'

    const trueRatio = post.true_votes / totalVotes
    const fakeRatio = post.fake_votes / totalVotes

    if (fakeRatio > 0.6) return 'bg-red-100 border-red-200'
    if (trueRatio > 0.6) return 'bg-green-100 border-green-200'
    return 'bg-yellow-100 border-yellow-200'
  }

  const getVoteButtonStyle = (voteType: 'fake' | 'true' | 'neutral') => {
    const isActive = userVote === voteType
    const baseStyle = "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors"
    
    if (voteType === 'true') {
      return `${baseStyle} ${isActive ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-green-50'}`
    } else if (voteType === 'fake') {
      return `${baseStyle} ${isActive ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-red-50'}`
    } else {
      return `${baseStyle} ${isActive ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-100 text-gray-700 hover:bg-yellow-50'}`
    }
  }

  // Function to get sentiment icon and styling
  const getSentimentDisplay = (sentimentLabel?: string, confidence?: number) => {
    if (!sentimentLabel || confidence === undefined || confidence < 0.2) {
      return null;
    }
    console.log('sentimentLabel', sentimentLabel)
    console.log('confidence', confidence)
    switch (sentimentLabel) {
      case 'supporting':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          text: 'Supporting',
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'claiming_fake':
        return {
          icon: <XCircle className="w-3 h-3" />,
          text: 'Claiming Fake',
          className: 'bg-red-100 text-red-700 border-red-200'
        };
      case 'neutral':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: 'Neutral',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      default:
        return null;
    }
  };

  // Function to calculate combined verification status
  const getCombinedVerificationStatus = (post: Post) => {
    const voteWeight = 0.6; // 60% weight for votes
    const sentimentWeight = 0.4; // 40% weight for sentiment analysis
    
    const totalVotes = post.true_votes + post.fake_votes + post.neutral_votes;
    
    // Calculate vote-based score (-1 to 1)
    const voteScore = totalVotes > 0 ? (post.true_votes - post.fake_votes) / totalVotes : 0;
    
    // Calculate sentiment-based score (-1 to 1)
    let sentimentScore = 0;
    if (post.overall_sentiment_label && post.overall_sentiment_confidence && post.overall_sentiment_confidence > 0.1) {
      switch (post.overall_sentiment_label) {
        case 'true':
          sentimentScore = post.overall_sentiment_confidence;
          break;
        case 'fake':
          sentimentScore = -post.overall_sentiment_confidence;
          break;
        case 'neutral':
          sentimentScore = 0;
          break;
      }
    }
    
    // Combine scores
    const combinedScore = (voteScore * voteWeight) + (sentimentScore * sentimentWeight);
    
    // Determine final status
    if (combinedScore > 0.1) {
      return {
        status: 'true',
        confidence: Math.abs(combinedScore),
        label: '✓ Verified as True',
        className: 'bg-green-100 text-green-700'
      };
    } else if (combinedScore < -0.1) {
      return {
        status: 'fake',
        confidence: Math.abs(combinedScore),
        label: '✗ Marked as Fake',
        className: 'bg-red-100 text-red-700'
      };
    } else {
      return {
        status: 'neutral',
        confidence: 1 - Math.abs(combinedScore),
        label: '○ Neutral',
        className: 'bg-gray-100 text-gray-700'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>

      {/* Post */}
      <Card className={`mb-6 ${getVoteBackgroundColor(post)}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
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
        </CardHeader>
        <CardContent>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{post.description}</p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Voting */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => handleVote('true')}
              disabled={!user}
              className={getVoteButtonStyle('true')}
            >
              <ThumbsUp className="w-4 h-4" />
              {post.true_votes} True
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleVote('neutral')}
              disabled={!user}
              className={getVoteButtonStyle('neutral')}
            >
              <Minus className="w-4 h-4" />
              {post.neutral_votes} Neutral
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleVote('fake')}
              disabled={!user}
              className={getVoteButtonStyle('fake')}
            >
              <ThumbsDown className="w-4 h-4" />
              {post.fake_votes} Fake
            </Button>
          </div>

          {/* Verification Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">Verification Status</h4>
            
            {/* Combined Verification Status */}
            {(() => {
              const combinedStatus = getCombinedVerificationStatus(post);
              return (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">Combined Verification</div>
                  <div className={`text-center px-2 py-1 rounded text-xs font-medium ${combinedStatus.className}`}>
                    {combinedStatus.label}
                    <span className="ml-1 text-xs opacity-75">
                      ({Math.round(combinedStatus.confidence * 100)}%)
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Individual Analysis Breakdown */}
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
              <div className="text-xs text-gray-600">Analysis Breakdown</div>
              
              {/* Vote-based status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Community Votes:</span>
                <span className={`px-2 py-0.5 rounded ${
                  post.vote_score > 0 ? 'bg-green-100 text-green-700' : 
                  post.vote_score < 0 ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  {post.vote_score > 0 ? 'True' : 
                   post.vote_score < 0 ? 'Fake' : 
                   'Neutral'}
                </span>
              </div>
              
              {/* Sentiment Analysis */}
              {post.overall_sentiment_label && post.overall_sentiment_confidence && post.overall_sentiment_confidence > 0.1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">AI Sentiment:</span>
                  <span className={`px-2 py-0.5 rounded ${
                    post.overall_sentiment_label === 'true' ? 'bg-green-100 text-green-700' : 
                    post.overall_sentiment_label === 'fake' ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {post.overall_sentiment_label === 'true' ? 'True' : 
                     post.overall_sentiment_label === 'fake' ? 'Fake' : 
                     'Neutral'}
                    <span className="ml-1 opacity-75">
                      ({Math.round(post.overall_sentiment_confidence * 100)}%)
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({comments.length})
          </h2>
        </CardHeader>
        <CardContent>
          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts on this news story..."
                rows={3}
                className="mb-3"
              />
              <Button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="flex items-center gap-2"
              >
                <Reply className="w-4 h-4" />
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </form>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600 mb-2">Please sign in to comment</p>
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => {
                const sentimentDisplay = getSentimentDisplay(comment.sentiment_label, comment.sentiment_confidence);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.author?.avatar_url} />
                      <AvatarFallback>
                        {comment.author?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {comment.author?.full_name || 'Anonymous'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                          {sentimentDisplay && (
                            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border ${sentimentDisplay.className}`}>
                              {sentimentDisplay.icon}
                              <span>{sentimentDisplay.text}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
