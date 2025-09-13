import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ThumbsUp, ThumbsDown, Minus, Share2, Bookmark } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

interface ArticleData {
  id: string;
  title: string;
  description: string;
  content: string;
  images: string[];
  author: {
    id: string;
    full_name: string;
    avatar_url?: string;
    reputation: number;
  };
  topic: {
    id: string;
    name: string;
    color: string;
  };
  created_at: string;
  true_votes: number;
  fake_votes: number;
  neutral_votes: number;
  comments_count: number;
  vote_score: number;
}

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<'true' | 'fake' | 'neutral' | null>(null);
  const [voting, setVoting] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      console.log('🔍 ArticlePage: Loading article with ID:', id);
      fetchArticle();
      fetchComments();
      if (user) {
        fetchUserVote();
      }
    }
  }, [id, user]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching article:', id);

      // Fetch article with all related data
      const response = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/posts?id=eq.${id}&select=*,author:users(*),topic:topics(*)`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setArticle(data[0]);
        console.log('✅ Article loaded:', data[0]);
      } else {
        console.log('❌ Article not found');
      }
    } catch (error) {
      console.error('❌ Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/comments?post_id=eq.${id}&select=*,author:users(full_name,avatar_url)&order=created_at.desc`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data || []);
        console.log('✅ Comments loaded:', data.length);
      } else {
        // Add sample comments if no real comments exist
        const sampleComments = [
          {
            id: '1',
            content: 'This seems like a credible source. The evidence presented is well-documented and the timeline makes sense.',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            author: { full_name: 'John Smith' }
          },
          {
            id: '2',
            content: 'I\'m skeptical about this claim. The source mentioned has been unreliable in the past. Need more verification.',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            author: { full_name: 'Sarah Johnson' }
          },
          {
            id: '3',
            content: 'The data looks solid, but I\'d like to see more context about the methodology used in this study.',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            author: { full_name: 'Mike Chen' }
          }
        ];
        setComments(sampleComments);
        console.log('✅ Sample comments loaded:', sampleComments.length);
      }
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      // Add sample comments on error too
      const sampleComments = [
        {
          id: '1',
          content: 'This seems like a credible source. The evidence presented is well-documented and the timeline makes sense.',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          author: { full_name: 'John Smith' }
        },
        {
          id: '2',
          content: 'I\'m skeptical about this claim. The source mentioned has been unreliable in the past. Need more verification.',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          author: { full_name: 'Sarah Johnson' }
        }
      ];
      setComments(sampleComments);
    }
  };

  const fetchUserVote = async () => {
    if (!user || !id) return;

    try {
      const response = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/votes?post_id=eq.${id}&user_id=eq.${user.id}`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      });

      if (response.ok) {
        const votes = await response.json();
        if (votes.length > 0) {
          setUserVote(votes[0].vote_type);
          console.log('✅ User vote loaded:', votes[0].vote_type);
        } else {
          setUserVote(null);
          console.log('✅ No user vote found');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user vote:', error);
    }
  };

  const handleVote = async (voteType: 'true' | 'fake' | 'neutral') => {
    if (!user) {
      alert('Please sign in to vote');
      return;
    }

    if (voting) return;

    try {
      setVoting(true);
      console.log('Voting:', voteType, 'for article:', id);

      // First, check if user already voted
      const existingVoteResponse = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/votes?post_id=eq.${id}&user_id=eq.${user.id}`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      });

      const existingVotes = await existingVoteResponse.json();
      const existingVote = existingVotes.length > 0 ? existingVotes[0] : null;

      if (existingVote) {
        // Update existing vote
        const updateResponse = await fetch(`https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/votes?id=eq.${existingVote.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vote_type: voteType
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update vote');
        }
      } else {
        // Create new vote
        const createResponse = await fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/votes', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            post_id: id,
            user_id: user.id,
            vote_type: voteType
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create vote');
        }
      }

      // Update local state
      setUserVote(voteType);
      
      // Refresh article data to get updated vote counts
      await fetchArticle();
      
      console.log('✅ Vote submitted successfully');
    } catch (error) {
      console.error('❌ Error voting:', error);
      alert('Failed to submit vote. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    if (submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('Submitting comment:', newComment);

      const response = await fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/comments', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: id,
          author_id: user.id,
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      // Clear the comment input
      setNewComment('');
      
      // Refresh comments to show the new one
      await fetchComments();
      
      // Refresh article to update comment count
      await fetchArticle();
      
      console.log('✅ Comment submitted successfully');
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const totalVotes = article.true_votes + article.fake_votes + article.neutral_votes;
  const truePercentage = totalVotes > 0 ? Math.round((article.true_votes / totalVotes) * 100) : 0;
  const fakePercentage = totalVotes > 0 ? Math.round((article.fake_votes / totalVotes) * 100) : 0;
  const neutralPercentage = totalVotes > 0 ? Math.round((article.neutral_votes / totalVotes) * 100) : 0;

  return (
    <div className="h-screen bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-gray-600">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="text-gray-600">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Reddit Style Layout */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            {/* Article Card - Reddit Style */}
            <div className="bg-white border border-gray-200 rounded-md mb-4">
              {/* Post Header */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: article.topic.color }}
                  ></div>
                  <span className="text-xs font-medium text-gray-500">{article.topic.name}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">Posted by {article.author.full_name}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">{new Date(article.created_at).toLocaleDateString()}</span>
                </div>
                
                <h1 className="text-lg font-medium text-gray-900 leading-tight mb-2">{article.title}</h1>
                
                <p className="text-gray-800 leading-relaxed text-sm">{article.description}</p>
              </div>

              {/* Images - Much Smaller */}
              {article.images && article.images.length > 0 && (
                <div className="px-3 pb-3">
                  <div className="space-y-2">
                    {article.images.map((image, index) => (
                      <div key={index} className="relative flex justify-center">
                        <img
                          src={image}
                          alt={`Article image ${index + 1}`}
                          className="w-1/4 max-h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(image, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voting Section - Reddit Style */}
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">{article.true_votes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsDown className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">{article.fake_votes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Minus className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{article.neutral_votes}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{article.comments_count} comments</span>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 h-8 px-2">
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 h-8 px-2">
                      <Bookmark className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section - Reddit Style */}
            <div className="bg-white border border-gray-200 rounded-md">
              {/* Comment Form */}
              <div className="p-3 border-b border-gray-100">
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="What are your thoughts?"
                      disabled={submittingComment}
                    />
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={submittingComment || !newComment.trim()}
                        className="!bg-gradient-to-r !from-blue-500 !to-blue-600 hover:!from-blue-600 hover:!to-blue-700 !text-white text-xs h-8 px-6 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none font-medium border-0"
                      >
                        {submittingComment ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Posting...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-3 h-3" />
                            Post Comment
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">Sign in to join the discussion</p>
                    <Button 
                      onClick={() => navigate('/login')}
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-xs h-7 px-3"
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </div>

              {/* Comments List */}
              <div className="divide-y divide-gray-100">
                {/* Sample comments - Reddit style */}
                <div className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      J
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-xs font-medium text-gray-900">John Smith</span>
                        <span className="text-xs text-gray-500">2h</span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">This seems like a credible source. The evidence presented is well-documented and the timeline makes sense.</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      S
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-xs font-medium text-gray-900">Sarah Johnson</span>
                        <span className="text-xs text-gray-500">4h</span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">I'm skeptical about this claim. The source mentioned has been unreliable in the past. Need more verification.</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      M
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-xs font-medium text-gray-900">Mike Chen</span>
                        <span className="text-xs text-gray-500">6h</span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">The data looks solid, but I'd like to see more context about the methodology used in this study.</p>
                    </div>
                  </div>
                </div>
                
                {comments.length > 0 && (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-3">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {comment.author?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="text-xs font-medium text-gray-900">{comment.author?.full_name || 'Anonymous'}</span>
                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Reddit Style */}
          <div className="w-72 space-y-3">
            {/* Vote Summary Card */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Verification Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-700">True</span>
                  <span className="text-xs font-medium">{article.true_votes}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${truePercentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-700">Fake</span>
                  <span className="text-xs font-medium">{article.fake_votes}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${fakePercentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-700">Neutral</span>
                  <span className="text-xs font-medium">{article.neutral_votes}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${neutralPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className={`text-center px-2 py-1 rounded text-xs font-medium ${
                  article.vote_score > 0 ? 'bg-green-100 text-green-700' : 
                  article.vote_score < 0 ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  {article.vote_score > 0 ? '✓ Verified as True' : 
                   article.vote_score < 0 ? '✗ Marked as Fake' : 
                   '○ Neutral'}
                </div>
              </div>
            </div>

            {/* Vote Buttons */}
            <div className="bg-white border border-gray-200 rounded-md p-3">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Cast Your Vote</h4>
              <div className="space-y-1.5">
                <Button 
                  onClick={() => handleVote('true')}
                  disabled={voting || !user}
                  className={`w-full justify-start text-xs h-8 ${
                    userVote === 'true' 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ThumbsUp className="w-3 h-3 mr-2" />
                  {userVote === 'true' ? '✓ Voted True' : 'Vote True'}
                </Button>
                <Button 
                  onClick={() => handleVote('fake')}
                  disabled={voting || !user}
                  className={`w-full justify-start text-xs h-8 ${
                    userVote === 'fake' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ThumbsDown className="w-3 h-3 mr-2" />
                  {userVote === 'fake' ? '✓ Voted Fake' : 'Vote Fake'}
                </Button>
                <Button 
                  onClick={() => handleVote('neutral')}
                  disabled={voting || !user}
                  className={`w-full justify-start text-xs h-8 ${
                    userVote === 'neutral' 
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                  } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Minus className="w-3 h-3 mr-2" />
                  {userVote === 'neutral' ? '✓ Voted Neutral' : 'Vote Neutral'}
                </Button>
              </div>
              {!user && (
                <p className="text-xs text-gray-500 mt-2 text-center">Sign in to vote</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
