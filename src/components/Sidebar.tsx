import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Topic } from '../lib/supabase'
import { User, Settings, Newspaper, Home, LogIn, LogOut, Plus, Award } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

export function Sidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      console.log('🔍 Sidebar: Fetching topics using direct API...')
      const response = await fetch('https://dvvkxsppnnquhfwwbrgh.supabase.co/rest/v1/topics?select=*&order=name', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmt4c3Bwbm5xdWhmd3dicmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg0MzksImV4cCI6MjA3MzMyNDQzOX0.oEdAIwHqfcf4yo_GVszmxUxkjHqf-QxXiTNwfuBZKSI'
        }
      })

      console.log('🔍 Sidebar: Topics response status:', response.status)

      if (!response.ok) {
        throw new Error(`Topics API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Sidebar: Topics data:', data.length, 'topics')
      setTopics(data || [])
    } catch (error) {
      console.error('❌ Sidebar: Error fetching topics:', error)
    }
  }

  const navigationItems = [
    { icon: Home, label: "Home", path: "/", active: location.pathname === "/" },
    { icon: Plus, label: "Create Post", path: "/create", active: location.pathname === "/create" },
    { icon: User, label: "Profile", path: "/profile", active: location.pathname === "/profile" },
  ]

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return { level: 'Expert', color: 'bg-purple-100 text-purple-800' }
    if (reputation >= 500) return { level: 'Veteran', color: 'bg-blue-100 text-blue-800' }
    if (reputation >= 100) return { level: 'Experienced', color: 'bg-green-100 text-green-800' }
    if (reputation >= 50) return { level: 'Contributor', color: 'bg-yellow-100 text-yellow-800' }
    return { level: 'Newcomer', color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Profile Section */}
      <div className="p-6 border-b border-gray-200">
        {user ? (
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>
                {user.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
              <div className="flex items-center gap-1">
                <Badge className={`text-xs ${getReputationLevel(user.reputation).color}`}>
                  <Award className="w-3 h-3 mr-1" />
                  {getReputationLevel(user.reputation).level}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-3">Welcome to Journalist News Verification</p>
            <Link to="/login">
              <Button size="sm" className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Topics Section */}
        <div className="mt-8">
          <h3 className="px-3 mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Topics
          </h3>
          <ul className="space-y-1">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  to={`/?topic=${topic.id}`}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900"
                >
                  <span 
                    className="w-2 h-2 rounded-full mr-3"
                    style={{ backgroundColor: topic.color }}
                  ></span>
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              Join the community of journalists
            </p>
            <Link to="/login">
              <Button size="sm" variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}