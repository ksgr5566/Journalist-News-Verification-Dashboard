import { StreamingSection } from "./StreamingSection";
import { NewsBoxItem } from "./NewsBox";

interface SubColumn {
  height: string;
  topic: string;
  newsItems: NewsBoxItem[];
}

interface TopicColumnProps {
  columnId: number;
  subColumns: SubColumn[];
}

export function TopicColumn({ columnId, subColumns }: TopicColumnProps) {
  return (
    <div className="h-full flex flex-col">
      {subColumns.map((subColumn, index) => (
        <div 
          key={`column-${columnId}-sub-${index}`}
          className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm relative"
          style={{
            height: subColumn.height,
            marginBottom: index < subColumns.length - 1 ? '8px' : '0'
          }}
        >
          {/* Additional containment layer */}
          <div className="absolute inset-0 overflow-hidden">
            <StreamingSection
              title={subColumn.topic}
              height="h-full"
              newsItems={subColumn.newsItems}
              updateInterval={4000 + (index * 800)} // Staggered updates
            />
          </div>
        </div>
      ))}
    </div>
  );
}