import React from "react";
import { Search, Filter, SortDesc, TrendingUp, AlertTriangle } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Topic } from "../lib/supabase";

interface SearchFiltersProps {
  topics: Topic[]
  selectedTopic: string | null
  onTopicChange: (topicId: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: 'newest' | 'trending' | 'controversial'
  onSortChange: (sort: 'newest' | 'trending' | 'controversial') => void
}

export function SearchFilters({
  topics,
  selectedTopic,
  onTopicChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange
}: SearchFiltersProps) {
  const getSortIcon = (sort: string) => {
    switch (sort) {
      case 'trending': return <TrendingUp className="h-4 w-4" />
      case 'controversial': return <AlertTriangle className="h-4 w-4" />
      default: return <SortDesc className="h-4 w-4" />
    }
  }

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'trending': return 'Trending'
      case 'controversial': return 'Controversial'
      default: return 'Latest'
    }
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search news articles..."
          className="pl-10 bg-gray-50 border-gray-200"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Topic Filter */}
      <Select value={selectedTopic || 'all'} onValueChange={(value) => onTopicChange(value === 'all' ? null : value)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Topics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Topics</SelectItem>
          {topics.map((topic) => (
            <SelectItem key={topic.id} value={topic.id}>
              {topic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={(value: any) => onSortChange(value)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">
            <div className="flex items-center gap-2">
              <SortDesc className="h-4 w-4" />
              Latest
            </div>
          </SelectItem>
          <SelectItem value="trending">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </div>
          </SelectItem>
          <SelectItem value="controversial">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Controversial
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {(selectedTopic || searchQuery) && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            onTopicChange(null)
            onSearchChange('')
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}