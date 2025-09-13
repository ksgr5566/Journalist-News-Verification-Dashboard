import React from 'react'
import { X, MessageCircle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { NewsBoxItem } from './NewsBox'

interface ArticleModalProps {
  article: NewsBoxItem | null
  isOpen: boolean
  onClose: () => void
}

export const ArticleModal: React.FC<ArticleModalProps> = ({ article, isOpen, onClose }) => {
  if (!isOpen || !article) return null

  // Debug: Log the article data
  console.log('🔍 ArticleModal received data:', article)

  const totalVotes = article.trueVotes + article.fakeVotes + article.neutralVotes
  const truePercentage = totalVotes > 0 ? Math.round((article.trueVotes / totalVotes) * 100) : 0
  const fakePercentage = totalVotes > 0 ? Math.round((article.fakeVotes / totalVotes) * 100) : 0
  const neutralPercentage = totalVotes > 0 ? Math.round((article.neutralVotes / totalVotes) * 100) : 0

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        console.log('🔍 Modal backdrop clicked')
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>by {article.author}</span>
              <span>•</span>
              <span>{new Date(article.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">{article.description}</p>
          </div>

          {/* Images */}
          {article.images && article.images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Article image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Voting Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Community Verification</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">{article.trueVotes} True</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-700">{article.fakeVotes} Fake</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Minus className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">{article.neutralVotes} Neutral</span>
                  </div>
                </div>
                <Badge className={`px-3 py-1 ${
                  article.voteScore > 0 ? 'bg-green-100 text-green-700' : 
                  article.voteScore < 0 ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  {article.voteScore > 0 ? 'Verified as True' : 
                   article.voteScore < 0 ? 'Marked as Fake' : 
                   'Neutral'}
                </Badge>
              </div>
              
              {/* Vote Progress Bars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">True</span>
                  <span className="text-gray-600">{truePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${truePercentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700">Fake</span>
                  <span className="text-gray-600">{fakePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${fakePercentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Neutral</span>
                  <span className="text-gray-600">{neutralPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${neutralPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Discussions ({article.commentsCount})
            </h3>
            <div className="space-y-4">
              {/* Sample comments */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    J
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">John Smith</span>
                    <span className="text-gray-500 text-sm ml-2">2 hours ago</span>
                  </div>
                </div>
                <p className="text-gray-700">This seems like a credible source. The evidence presented is well-documented and the timeline makes sense.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    S
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Sarah Johnson</span>
                    <span className="text-gray-500 text-sm ml-2">4 hours ago</span>
                  </div>
                </div>
                <p className="text-gray-700">I'm skeptical about this claim. The source mentioned has been unreliable in the past. Need more verification.</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    M
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Mike Chen</span>
                    <span className="text-gray-500 text-sm ml-2">6 hours ago</span>
                  </div>
                </div>
                <p className="text-gray-700">The data looks solid, but I'd like to see more context about the methodology used in this study.</p>
              </div>

              {article.commentsCount === 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-center py-8">
                    No comments yet. Be the first to discuss!
                  </p>
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="mt-6">
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Join the discussion..."
              ></textarea>
              <button className="mt-3 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                Post Comment
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total votes: {totalVotes} • Score: {article.voteScore}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>
              <MessageCircle className="w-4 h-4 mr-2" />
              Join Discussion
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
