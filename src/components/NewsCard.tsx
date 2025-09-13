import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  contributor: {
    name: string;
    avatar: string;
    initials: string;
  };
  status: "verified" | "fake" | "unverified";
  timestamp: string;
  topic: string;
  height?: "small" | "medium" | "large";
}

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "verified":
        return "border-l-green-500 bg-green-50/30";
      case "fake":
        return "border-l-red-500 bg-red-50/30";
      case "unverified":
        return "border-l-gray-400 bg-gray-50/30";
      default:
        return "border-l-gray-400 bg-gray-50/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
      case "fake":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Fake</Badge>;
      case "unverified":
        return <Badge variant="outline" className="text-gray-600">Unverified</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600">Unknown</Badge>;
    }
  };

  const getCardHeight = (height?: string) => {
    switch (height) {
      case "small":
        return "min-h-32";
      case "large":
        return "min-h-48";
      default:
        return "min-h-40";
    }
  };

  return (
    <div
      className={`${getStatusStyles(news.status)} ${getCardHeight(news.height)} 
                  border-l-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow 
                  duration-200 p-4 mb-4 cursor-pointer group`}
    >
      {/* Topic and Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {news.topic}
        </span>
        {getStatusBadge(news.status)}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
        {news.title}
      </h3>

      {/* Snippet */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {news.snippet}
      </p>

      {/* Contributor Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={news.contributor.avatar} alt={news.contributor.name} />
            <AvatarFallback className="text-xs">{news.contributor.initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500">{news.contributor.name}</span>
        </div>
        <span className="text-xs text-gray-400">{news.timestamp}</span>
      </div>
    </div>
  );
}