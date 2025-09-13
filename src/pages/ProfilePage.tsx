import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Post, User } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { PostCard } from '../components/PostCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Edit, Award, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.full_name)
      fetchUserPosts()
    }
  }, [user])

  const fetchUserPosts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          topic:topics(*),
          author:users(*)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUserPosts(data || [])
    } catch (error) {
      console.error('Error fetching user posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return

    try {
      await updateProfile({ full_name: displayName.trim() })
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return { level: 'Expert', color: 'bg-purple-100 text-purple-800' }
    if (reputation >= 500) return { level: 'Veteran', color: 'bg-blue-100 text-blue-800' }
    if (reputation >= 100) return { level: 'Experienced', color: 'bg-green-100 text-green-800' }
    if (reputation >= 50) return { level: 'Contributor', color: 'bg-yellow-100 text-yellow-800' }
    return { level: 'Newcomer', color: 'bg-gray-100 text-gray-800' }
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

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your profile</h2>
        <Button onClick={() => window.location.href = '/login'}>Sign In</Button>
      </div>
    )
  }

  const reputationInfo = getReputationLevel(user.reputation)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {user.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                    />
                    <Button size="sm" onClick={handleSaveProfile}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={reputationInfo.color}>
                    <Award className="w-3 h-3 mr-1" />
                    {reputationInfo.level}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {user.reputation} reputation points
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userPosts.length}</div>
            <div className="text-sm text-gray-600">Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {userPosts.reduce((sum, post) => sum + post.true_votes, 0)}
            </div>
            <div className="text-sm text-gray-600">True Votes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {userPosts.reduce((sum, post) => sum + post.fake_votes, 0)}
            </div>
            <div className="text-sm text-gray-600">Fake Votes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {userPosts.reduce((sum, post) => sum + post.comments_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Comments</div>
          </CardContent>
        </Card>
      </div>

      {/* Posts */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">My Posts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : userPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <TrendingUp className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-4">Start sharing news stories to build your reputation</p>
                <Button onClick={() => window.location.href = '/create'}>
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className={`rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getVoteBackgroundColor(post)}`}
                >
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPosts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {post.true_votes > post.fake_votes ? (
                        <ThumbsUp className="w-5 h-5 text-green-600" />
                      ) : post.fake_votes > post.true_votes ? (
                        <ThumbsDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <MessageSquare className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-600">+{post.true_votes}</span>
                      <span className="text-red-600">-{post.fake_votes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
