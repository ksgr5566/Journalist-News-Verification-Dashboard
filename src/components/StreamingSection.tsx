import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NewsBox, NewsBoxItem } from "./NewsBox";

interface StreamingSectionProps {
  title: string;
  height: string;
  newsItems: NewsBoxItem[];
  updateInterval?: number;
}

export function StreamingSection({ 
  title, 
  height, 
  newsItems, 
  updateInterval = 3000 
}: StreamingSectionProps) {
  const [visibleNews, setVisibleNews] = useState<NewsBoxItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Initialize with first few items
    setVisibleNews(newsItems.slice(0, 3));
    setCurrentIndex(3);
  }, [newsItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (newsItems.length === 0) return;

      setVisibleNews(prev => {
        // Remove the oldest item and add a new one
        const newItems = [...prev.slice(1)];
        
        // Add new item if available
        if (currentIndex < newsItems.length) {
          newItems.push(newsItems[currentIndex]);
          setCurrentIndex(prevIndex => 
            prevIndex + 1 >= newsItems.length ? 0 : prevIndex + 1
          );
        } else {
          // Cycle back to beginning
          newItems.push(newsItems[0]);
          setCurrentIndex(1);
        }
        
        return newItems;
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [newsItems, currentIndex, updateInterval]);

  return (
    <div className={`${height} p-4 flex flex-col relative`}>
      {/* Section Header */}
      <div className="mb-3 pb-2 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-medium text-gray-700">{title}</h3>
        <div className="w-8 h-1 bg-blue-500 rounded-full mt-1"></div>
      </div>

      {/* Streaming News Boxes Container with strict boundaries */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="space-y-2 h-full overflow-hidden">
            <AnimatePresence mode="popLayout">
              {visibleNews.map((news, index) => (
                <motion.div
                  key={`${news.id}-${Date.now()}`}
                  layout
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.95,
                    transition: { duration: 0.4, ease: "easeIn" }
                  }}
                  className="overflow-hidden"
                >
                  <NewsBox news={news} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center justify-center mt-2 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <motion.div
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
    </div>
  );
}