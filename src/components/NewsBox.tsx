import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

export interface NewsBoxItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  author: string;
  createdAt: string;
  trueVotes: number;
  fakeVotes: number;
  neutralVotes: number;
  commentsCount: number;
  voteScore: number;
  status?: "verified" | "fake" | "unverified";
  height?: "small" | "medium" | "large";
}

interface NewsBoxProps {
  news: NewsBoxItem;
  index: number;
}

export function NewsBox({ news, index }: NewsBoxProps) {
  const navigate = useNavigate();

  const getStatusBorderColor = () => {
    // Determine status based on vote ratio
    const totalVotes = news.trueVotes + news.fakeVotes + news.neutralVotes;
    if (totalVotes === 0) return "border-gray-400";
    
    const trueRatio = news.trueVotes / totalVotes;
    const fakeRatio = news.fakeVotes / totalVotes;
    
    if (trueRatio > 0.6) return "border-green-500";
    if (fakeRatio > 0.6) return "border-red-500";
    return "border-yellow-500";
  };

  const handleClick = () => {
    navigate(`/article/${news.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.15,
        ease: "easeOut"
      }}
      onClick={handleClick}
      className={`${getStatusBorderColor()} 
                  border-l-4 bg-white rounded-lg shadow-sm hover:shadow-md 
                  transition-all duration-200 p-3 mb-3 cursor-pointer group`}
    >
      <h4 className="font-medium text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">
        {news.title}
      </h4>
      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
        {news.description}
      </p>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>by {news.author}</span>
        <span>{news.commentsCount} comments</span>
      </div>
    </motion.div>
  );
}