import { NewsBoxItem } from "../components/NewsBox";

export const mockNewsBoxData: NewsBoxItem[] = [
  // Politics
  { id: "1", title: "New Infrastructure Bill Passes Senate Vote", status: "verified", height: "medium" },
  { id: "2", title: "Presidential Candidate Makes Bold Climate Promise", status: "unverified", height: "large" },
  { id: "3", title: "Congress Debates Healthcare Reform Package", status: "verified", height: "small" },
  { id: "4", title: "Secret Government Meeting Leaked to Press", status: "fake", height: "medium" },
  { id: "5", title: "Supreme Court Reviews Voting Rights Case", status: "verified", height: "large" },
  { id: "6", title: "Mayor Announces City Budget Allocation", status: "verified", height: "small" },
  { id: "7", title: "Political Party Plans Major Rally", status: "unverified", height: "medium" },
  { id: "8", title: "Election Results Show Voter Fraud", status: "fake", height: "small" },

  // Technology  
  { id: "9", title: "AI Breakthrough in Medical Diagnosis", status: "verified", height: "large" },
  { id: "10", title: "Tech Giant Announces Quantum Computer", status: "unverified", height: "medium" },
  { id: "11", title: "New Social Media Platform Gains Millions", status: "verified", height: "small" },
  { id: "12", title: "Smartphone Can Read Your Thoughts", status: "fake", height: "medium" },
  { id: "13", title: "Cybersecurity Breach Affects Major Bank", status: "verified", height: "large" },
  { id: "14", title: "Electric Vehicle Sales Surge Globally", status: "verified", height: "medium" },
  { id: "15", title: "Space Company Plans Mars Colony", status: "unverified", height: "small" },
  { id: "16", title: "5G Networks Cause Health Problems", status: "fake", height: "large" },

  // Health
  { id: "17", title: "New Cancer Treatment Shows Promise", status: "verified", height: "large" },
  { id: "18", title: "Vitamin D Prevents All Diseases", status: "fake", height: "medium" },
  { id: "19", title: "Mental Health Apps Gain Popularity", status: "verified", height: "small" },
  { id: "20", title: "Gene Therapy Restores Vision", status: "unverified", height: "large" },
  { id: "21", title: "Hospital Reduces Surgery Wait Times", status: "verified", height: "medium" },
  { id: "22", title: "Drinking Water Contaminated Citywide", status: "fake", height: "small" },
  { id: "23", title: "New Alzheimer's Drug Shows Results", status: "unverified", height: "large" },
  { id: "24", title: "Exercise Reduces Heart Disease Risk", status: "verified", height: "medium" },

  // International
  { id: "25", title: "Climate Summit Reaches Agreement", status: "verified", height: "large" },
  { id: "26", title: "Trade War Escalates Between Nations", status: "unverified", height: "medium" },
  { id: "27", title: "Humanitarian Crisis Worsens in Region", status: "verified", height: "large" },
  { id: "28", title: "Country Plans to Invade Neighbors", status: "fake", height: "small" },
  { id: "29", title: "International Aid Reaches Disaster Zone", status: "verified", height: "medium" },
  { id: "30", title: "New Alliance Forms Against Terrorism", status: "unverified", height: "small" },
  { id: "31", title: "Currency Crisis Spreads Globally", status: "verified", height: "large" },
  { id: "32", title: "World Leaders Meet in Secret", status: "fake", height: "medium" }
];

export const getNewsByTopic = (topic: string): NewsBoxItem[] => {
  const topicRanges = {
    "Politics": mockNewsBoxData.slice(0, 8),
    "Technology": mockNewsBoxData.slice(8, 16),
    "Health": mockNewsBoxData.slice(16, 24),
    "International": mockNewsBoxData.slice(24, 32)
  };
  
  return topicRanges[topic as keyof typeof topicRanges] || [];
};