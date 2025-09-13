-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing objects (run this first to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_user_reputation_votes ON votes;
DROP TRIGGER IF EXISTS trigger_update_user_reputation_posts ON posts;
DROP TRIGGER IF EXISTS trigger_update_post_vote_counts ON votes;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
DROP FUNCTION IF EXISTS update_user_reputation();
DROP FUNCTION IF EXISTS update_post_vote_counts();
DROP FUNCTION IF EXISTS update_post_comment_count();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  reputation INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT[],
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vote_score INTEGER DEFAULT 0,
  true_votes INTEGER DEFAULT 0,
  fake_votes INTEGER DEFAULT 0,
  neutral_votes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  -- Sentiment analysis fields for overall post sentiment
  overall_sentiment_score REAL DEFAULT 0.0, -- -1.0 to 1.0 (negative to positive)
  overall_sentiment_label TEXT CHECK (overall_sentiment_label IN ('true', 'fake', 'neutral')),
  overall_sentiment_confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
  sentiment_analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Sentiment analysis fields
  sentiment_score REAL DEFAULT 0.0, -- -1.0 to 1.0 (negative to positive)
  sentiment_label TEXT CHECK (sentiment_label IN ('supporting', 'claiming_fake', 'neutral')),
  sentiment_confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('fake', 'true', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_posts_topic_id ON posts(topic_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_vote_score ON posts(vote_score DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Create functions to update vote counts
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET 
      true_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'true'),
      fake_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'fake'),
      neutral_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'neutral'),
      vote_score = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'true') - 
                   (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'fake')
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE posts 
    SET 
      true_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'true'),
      fake_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'fake'),
      neutral_votes = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'neutral'),
      vote_score = (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'true') - 
                   (SELECT COUNT(*) FROM votes WHERE post_id = NEW.post_id AND vote_type = 'fake')
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET 
      true_votes = (SELECT COUNT(*) FROM votes WHERE post_id = OLD.post_id AND vote_type = 'true'),
      fake_votes = (SELECT COUNT(*) FROM votes WHERE post_id = OLD.post_id AND vote_type = 'fake'),
      neutral_votes = (SELECT COUNT(*) FROM votes WHERE post_id = OLD.post_id AND vote_type = 'neutral'),
      vote_score = (SELECT COUNT(*) FROM votes WHERE post_id = OLD.post_id AND vote_type = 'true') - 
                   (SELECT COUNT(*) FROM votes WHERE post_id = OLD.post_id AND vote_type = 'fake')
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote counts
CREATE TRIGGER trigger_update_post_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- Create function to update comment counts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment counts
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Create function to update post sentiment based on comments
CREATE OR REPLACE FUNCTION update_post_sentiment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update post sentiment when comments are added/updated/deleted
  UPDATE posts 
  SET 
    overall_sentiment_score = (
      SELECT COALESCE(AVG(sentiment_score), 0.0) 
      FROM comments 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
      AND sentiment_score IS NOT NULL
    ),
    overall_sentiment_label = (
      SELECT CASE 
        WHEN AVG(sentiment_score) > 0.1 THEN 'true'
        WHEN AVG(sentiment_score) < -0.1 THEN 'fake'
        ELSE 'neutral'
      END
      FROM comments 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
      AND sentiment_score IS NOT NULL
    ),
    overall_sentiment_confidence = (
      SELECT COALESCE(AVG(sentiment_confidence), 0.0)
      FROM comments 
      WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
      AND sentiment_confidence IS NOT NULL
    ),
    sentiment_analyzed_at = NOW()
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post sentiment updates
CREATE TRIGGER trigger_update_post_sentiment
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_sentiment();

-- Create function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Award reputation for creating posts
    IF TG_TABLE_NAME = 'posts' THEN
      UPDATE users 
      SET reputation = reputation + 10
      WHERE id = NEW.author_id;
    END IF;
    
    -- Award reputation for votes on their posts
    IF TG_TABLE_NAME = 'votes' THEN
      UPDATE users 
      SET reputation = reputation + 1
      WHERE id = (SELECT author_id FROM posts WHERE id = NEW.post_id);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove reputation for votes on their posts
    IF TG_TABLE_NAME = 'votes' THEN
      UPDATE users 
      SET reputation = reputation - 1
      WHERE id = (SELECT author_id FROM posts WHERE id = OLD.post_id);
    END IF;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user reputation
CREATE TRIGGER trigger_update_user_reputation_votes
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

CREATE TRIGGER trigger_update_user_reputation_posts
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Insert sample topics
INSERT INTO topics (name, description, color) VALUES
('Politics', 'Political news and government affairs', '#DC2626'),
('Technology', 'Tech industry news and innovations', '#2563EB'),
('Health', 'Health and medical news', '#059669'),
('Environment', 'Environmental and climate news', '#16A34A'),
('Sports', 'Sports news and updates', '#EA580C'),
('Business', 'Business and economic news', '#7C3AED'),
('Science', 'Scientific discoveries and research', '#0891B2'),
('World', 'International news and global affairs', '#BE185D');

-- Insert sample users
INSERT INTO users (id, email, full_name, avatar_url, reputation) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'sarah.johnson@example.com', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', 1250),
('550e8400-e29b-41d4-a716-446655440002', 'mike.chen@example.com', 'Mike Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 890),
('550e8400-e29b-41d4-a716-446655440003', 'emma.rodriguez@example.com', 'Emma Rodriguez', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 2100),
('550e8400-e29b-41d4-a716-446655440004', 'david.kim@example.com', 'David Kim', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 750),
('550e8400-e29b-41d4-a716-446655440005', 'lisa.thompson@example.com', 'Lisa Thompson', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', 450),
('550e8400-e29b-41d4-a716-446655440006', 'alex.martinez@example.com', 'Alex Martinez', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 320),
('550e8400-e29b-41d4-a716-446655440007', 'jessica.wong@example.com', 'Jessica Wong', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', 1800),
('550e8400-e29b-41d4-a716-446655440008', 'robert.brown@example.com', 'Robert Brown', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face', 650),
('550e8400-e29b-41d4-a716-446655440009', 'maria.garcia@example.com', 'Maria Garcia', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face', 950),
('550e8400-e29b-41d4-a716-446655440010', 'james.wilson@example.com', 'James Wilson', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 420);

-- Insert sample posts (many more for each topic)
INSERT INTO posts (id, title, description, topic_id, author_id, images) VALUES
-- Environment posts
('660e8400-e29b-41d4-a716-446655440001', 'Breaking: New Climate Agreement Reached at COP28', 'World leaders have reached a historic agreement on climate change at the COP28 summit. The new deal includes stronger commitments to reduce carbon emissions and increased funding for developing countries. This represents a significant step forward in global climate action.', 
 (SELECT id FROM topics WHERE name = 'Environment'), 
 '550e8400-e29b-41d4-a716-446655440001',
 ARRAY['https://images.unsplash.com/photo-1569163139397-4b0b4b8b8b8b?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440011', 'Arctic Ice Melting at Record Pace, Scientists Warn', 'New satellite data reveals that Arctic sea ice is melting at an unprecedented rate this summer. Climate scientists are concerned about the long-term implications for global weather patterns and sea level rise.', 
 (SELECT id FROM topics WHERE name = 'Environment'), 
 '550e8400-e29b-41d4-a716-446655440002',
 ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440012', 'Renewable Energy Surpasses Coal in Global Electricity Generation', 'For the first time in history, renewable energy sources have generated more electricity globally than coal-fired power plants. This milestone marks a significant shift in the world''s energy landscape.', 
 (SELECT id FROM topics WHERE name = 'Environment'), 
 '550e8400-e29b-41d4-a716-446655440003',
 ARRAY['https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=600&fit=crop']),

-- Technology posts
('660e8400-e29b-41d4-a716-446655440002', 'AI Breakthrough: New Model Achieves Human-Level Performance', 'Researchers at leading tech companies have developed an AI model that demonstrates human-level performance across multiple benchmarks. The model shows significant improvements in reasoning, creativity, and problem-solving capabilities.', 
 (SELECT id FROM topics WHERE name = 'Technology'), 
 '550e8400-e29b-41d4-a716-446655440002',
 ARRAY['https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440013', 'Quantum Computing Milestone: Error Correction Breakthrough', 'Scientists have achieved a major breakthrough in quantum computing by developing a new error correction method that could make quantum computers practical for real-world applications.', 
 (SELECT id FROM topics WHERE name = 'Technology'), 
 '550e8400-e29b-41d4-a716-446655440004',
 ARRAY['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440014', '5G Network Expansion Reaches Rural Areas', 'Major telecommunications companies have announced plans to expand 5G coverage to rural and underserved areas, promising to bridge the digital divide and bring high-speed internet to millions more people.', 
 (SELECT id FROM topics WHERE name = 'Technology'), 
 '550e8400-e29b-41d4-a716-446655440005',
 ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop']),

-- Politics posts
('660e8400-e29b-41d4-a716-446655440003', 'Election Results: Surprising Turnout in Key Districts', 'Early election results show unexpected voter turnout patterns in several key districts. Analysts are examining the implications for the upcoming general election and what this means for political strategy.', 
 (SELECT id FROM topics WHERE name = 'Politics'), 
 '550e8400-e29b-41d4-a716-446655440003',
 ARRAY['https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440015', 'New Legislation Aims to Reform Healthcare System', 'Lawmakers have introduced comprehensive healthcare reform legislation that seeks to address rising costs and improve access to medical services. The bill has bipartisan support but faces opposition from some industry groups.', 
 (SELECT id FROM topics WHERE name = 'Politics'), 
 '550e8400-e29b-41d4-a716-446655440006',
 ARRAY['https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440016', 'Supreme Court to Hear Major Constitutional Case', 'The Supreme Court has agreed to hear a landmark case that could have significant implications for constitutional law. Legal experts are divided on the potential outcomes and their broader impact.', 
 (SELECT id FROM topics WHERE name = 'Politics'), 
 '550e8400-e29b-41d4-a716-446655440007',
 ARRAY['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop']),

-- Health posts
('660e8400-e29b-41d4-a716-446655440004', 'Medical Study: New Treatment Shows Promise for Alzheimer''s', 'A groundbreaking study published in Nature Medicine reveals that a new treatment approach shows significant promise in slowing the progression of Alzheimer''s disease. The research involved 500 patients over two years.', 
 (SELECT id FROM topics WHERE name = 'Health'), 
 '550e8400-e29b-41d4-a716-446655440004',
 ARRAY['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440017', 'COVID-19 Vaccine Update: New Variant Protection', 'Pharmaceutical companies have announced updated vaccines that provide better protection against the latest COVID-19 variants. Health officials are recommending booster shots for vulnerable populations.', 
 (SELECT id FROM topics WHERE name = 'Health'), 
 '550e8400-e29b-41d4-a716-446655440008',
 ARRAY['https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440018', 'Mental Health Crisis: New Resources Available', 'In response to growing mental health concerns, government agencies have launched new programs and resources to provide support and treatment for those in need. The initiative includes expanded telehealth services.', 
 (SELECT id FROM topics WHERE name = 'Health'), 
 '550e8400-e29b-41d4-a716-446655440009',
 ARRAY['https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop']),

-- Sports posts
('660e8400-e29b-41d4-a716-446655440005', 'Olympic Games: Record-Breaking Performance in Swimming', 'The Olympic swimming competition concluded with several world records being broken. Athletes from multiple countries achieved personal bests, making this one of the most competitive swimming events in Olympic history.', 
 (SELECT id FROM topics WHERE name = 'Sports'), 
 '550e8400-e29b-41d4-a716-446655440005',
 ARRAY['https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440019', 'World Cup Final: Underdog Team Claims Victory', 'In a stunning upset, the underdog team defeated the heavily favored champions in the World Cup final. The victory marks the first time in decades that this team has won the prestigious tournament.', 
 (SELECT id FROM topics WHERE name = 'Sports'), 
 '550e8400-e29b-41d4-a716-446655440010',
 ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440020', 'Tennis Championship: Historic Comeback Victory', 'In one of the most dramatic matches in tennis history, a player came back from two sets down to win the championship. The match lasted over four hours and featured incredible displays of skill and determination.', 
 (SELECT id FROM topics WHERE name = 'Sports'), 
 '550e8400-e29b-41d4-a716-446655440001',
 ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop']),

-- Business posts
('660e8400-e29b-41d4-a716-446655440006', 'Economic Update: Inflation Rates Show Signs of Stabilization', 'Latest economic data indicates that inflation rates are beginning to stabilize after months of volatility. Central banks are cautiously optimistic about the trend, though they remain vigilant about potential future challenges.', 
 (SELECT id FROM topics WHERE name = 'Business'), 
 '550e8400-e29b-41d4-a716-446655440001',
 ARRAY['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440021', 'Stock Market Reaches New All-Time High', 'Major stock indices have reached record highs as investors show renewed confidence in the economy. Analysts attribute the gains to strong corporate earnings and optimistic economic forecasts.', 
 (SELECT id FROM topics WHERE name = 'Business'), 
 '550e8400-e29b-41d4-a716-446655440002',
 ARRAY['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440022', 'Tech Giant Announces Major Expansion Plans', 'One of the world''s largest technology companies has announced plans to invest billions in new facilities and hiring. The expansion is expected to create thousands of jobs and boost local economies.', 
 (SELECT id FROM topics WHERE name = 'Business'), 
 '550e8400-e29b-41d4-a716-446655440003',
 ARRAY['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop']),

-- Science posts
('660e8400-e29b-41d4-a716-446655440007', 'Space Mission: Mars Rover Discovers Evidence of Ancient Water', 'NASA''s latest Mars rover has discovered compelling evidence of ancient water activity on the red planet. The findings could have significant implications for our understanding of Mars'' geological history and potential for past life.', 
 (SELECT id FROM topics WHERE name = 'Science'), 
 '550e8400-e29b-41d4-a716-446655440002',
 ARRAY['https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440023', 'Breakthrough in Fusion Energy Research', 'Scientists have achieved a major milestone in fusion energy research, producing more energy than was consumed in the reaction. This breakthrough brings us closer to clean, unlimited energy sources.', 
 (SELECT id FROM topics WHERE name = 'Science'), 
 '550e8400-e29b-41d4-a716-446655440004',
 ARRAY['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440024', 'New Species Discovered in Deep Ocean', 'Marine biologists have discovered a new species of deep-sea creature that could provide insights into evolution and adaptation. The discovery was made using advanced underwater exploration technology.', 
 (SELECT id FROM topics WHERE name = 'Science'), 
 '550e8400-e29b-41d4-a716-446655440005',
 ARRAY['https://images.unsplash.com/photo-1559827260-dc66d52b09b7?w=800&h=600&fit=crop']),

-- World posts
('660e8400-e29b-41d4-a716-446655440008', 'International Relations: New Trade Agreement Signed', 'A major trade agreement has been signed between several countries, promising to boost economic cooperation and reduce trade barriers. The deal is expected to have positive impacts on global commerce and international relations.', 
 (SELECT id FROM topics WHERE name = 'World'), 
 '550e8400-e29b-41d4-a716-446655440003',
 ARRAY['https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440025', 'Peace Treaty Signed After Decades of Conflict', 'After years of negotiations, two nations have signed a historic peace treaty that officially ends decades of conflict. The agreement includes provisions for economic cooperation and cultural exchange.', 
 (SELECT id FROM topics WHERE name = 'World'), 
 '550e8400-e29b-41d4-a716-446655440006',
 ARRAY['https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop']),

('660e8400-e29b-41d4-a716-446655440026', 'Global Climate Summit: New Commitments Announced', 'World leaders have announced new commitments to combat climate change at the annual global climate summit. The pledges include increased funding for renewable energy and carbon reduction targets.', 
 (SELECT id FROM topics WHERE name = 'World'), 
 '550e8400-e29b-41d4-a716-446655440007',
 ARRAY['https://images.unsplash.com/photo-1569163139397-4b0b4b8b8b8b?w=800&h=600&fit=crop']);

-- Insert sample votes (many more for all posts)
INSERT INTO votes (post_id, user_id, vote_type) VALUES
-- Environment posts votes
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', 'neutral'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440008', 'neutral'),

('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440007', 'true'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440009', 'true'),

-- Technology posts votes
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007', 'neutral'),

('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440008', 'true'),

('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440007', 'neutral'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440009', 'true'),

-- Politics posts votes
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'fake'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'fake'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'neutral'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'fake'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'fake'),

('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', 'neutral'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440007', 'true'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440008', 'true'),

('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440001', 'neutral'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440005', 'neutral'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440009', 'true'),

-- Health posts votes
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'neutral'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440008', 'true'),

('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440002', 'neutral'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440009', 'true'),

-- Sports posts votes
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006', 'true'),

('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440008', 'true'),

-- Business posts votes
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'neutral'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', 'neutral'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440006', 'neutral'),

('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440007', 'true'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440008', 'true'),

-- Science posts votes
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440006', 'true'),

('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440006', 'true'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440008', 'neutral'),

-- World posts votes
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'neutral'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440007', 'true'),

('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440005', 'true'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440006', 'true'),

('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440001', 'true'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440002', 'true'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440003', 'true'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440004', 'true'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440007', 'true');

-- Insert sample comments (many more for active discussions)
INSERT INTO comments (post_id, author_id, content) VALUES
-- Environment posts comments
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'This is a significant step forward for climate action. The commitments made here could have real impact on global emissions.'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'I''m cautiously optimistic about this agreement. The key will be in the implementation and enforcement mechanisms.'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'The funding for developing countries is crucial. Without proper support, many nations won''t be able to meet their commitments.'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', 'This is exactly the kind of international cooperation we need to tackle climate change effectively.'),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', 'I hope this leads to concrete action rather than just more promises. We''ve seen too many agreements that don''t deliver.'),

('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'The Arctic ice data is alarming. We''re seeing changes that were predicted for much later in the century.'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 'This will have cascading effects on global weather patterns. The jet stream is already being affected.'),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 'We need immediate action to reduce emissions. The Arctic is warming faster than anywhere else on Earth.'),

('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'This is a historic milestone! Renewable energy is finally becoming the dominant source of electricity.'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440004', 'The cost of renewable energy has dropped dramatically. This makes the transition economically viable.'),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440005', 'This is great news, but we need to accelerate the transition even faster to meet climate goals.'),

-- Technology posts comments
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'This AI breakthrough is impressive, but we need to consider the ethical implications of such powerful technology.'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'The potential applications for this technology are vast. It could revolutionize many industries.'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'I''m excited to see how this will be used in healthcare and education. The possibilities are endless.'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440006', 'We need strong regulations to ensure this technology is used responsibly and doesn''t cause harm.'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007', 'The computational requirements for this model must be enormous. I wonder about the environmental impact.'),

('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'Quantum error correction is the key to making quantum computers practical. This is a major breakthrough.'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'This could revolutionize cryptography and drug discovery. The potential is mind-boggling.'),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440004', 'I''m curious about the specific error correction method they developed. The details matter a lot here.'),

('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', '5G expansion to rural areas is crucial for bridging the digital divide. This is long overdue.'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', 'The economic benefits of rural 5G could be significant. It enables remote work and new business opportunities.'),
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440005', 'I hope this includes proper infrastructure investment, not just coverage claims.'),

-- Politics posts comments
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'These turnout patterns are indeed surprising. I''d like to see more analysis on the demographic breakdown.'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'The implications for the general election could be significant. This could change campaign strategies.'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'I''m skeptical about these early results. We should wait for more complete data before drawing conclusions.'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'The youth vote seems to be driving this trend. Social media engagement might be a key factor.'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'This could indicate a shift in political engagement. People are becoming more active in local politics.'),

('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440001', 'Healthcare reform is desperately needed. The current system is failing too many people.'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440002', 'I''m concerned about the cost implications. We need to ensure this is sustainable long-term.'),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', 'The bipartisan support is encouraging. This suggests the bill addresses real needs across party lines.'),

('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440001', 'This case could have far-reaching implications for constitutional law. The stakes are very high.'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440002', 'I''m interested to see how the court interprets the relevant constitutional provisions.'),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440004', 'The legal community is divided on this issue. It will be fascinating to see the arguments presented.'),

-- Health posts comments
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'This is promising news for Alzheimer''s research. The study design looks solid and the results are encouraging.'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'As someone with family affected by Alzheimer''s, this gives me hope. I hope this treatment becomes available soon.'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'The sample size and duration are impressive. This could be a game-changer for Alzheimer''s treatment.'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'I''m cautiously optimistic. We''ve seen promising treatments before that didn''t pan out in larger trials.'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', 'The mechanism of action is interesting. Understanding how it works could lead to even better treatments.'),

('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440001', 'Updated vaccines are crucial for staying ahead of new variants. This is good news for public health.'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440002', 'I''m glad they''re prioritizing vulnerable populations. This is the right approach.'),
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440003', 'The rapid development of updated vaccines shows how far we''ve come in vaccine technology.'),

('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440001', 'Mental health resources are desperately needed. This initiative is a step in the right direction.'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440002', 'Telehealth services can make mental health care more accessible. This is especially important for rural areas.'),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440004', 'I hope this includes proper funding for mental health professionals. We need more trained providers.'),

-- Sports posts comments
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'What an incredible display of athleticism! These athletes have trained for years to reach this level.'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'The competition was fierce. Every race was decided by fractions of a second.'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'These world records show how much the sport has evolved. Training methods and technology have come so far.'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'The dedication and sacrifice these athletes show is truly inspiring. They''re role models for perseverance.'),

('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440001', 'What an upset! This is why we love sports - anything can happen on any given day.'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440002', 'The underdog story is always the most compelling. This victory will be remembered for years to come.'),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440003', 'This shows that preparation and strategy can overcome raw talent. The coaching staff deserves credit.'),

('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'That comeback was absolutely incredible! The mental toughness required is unbelievable.'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002', 'Four hours of tennis at that level is physically and mentally exhausting. What an athlete!'),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440004', 'This match will go down in history as one of the greatest comebacks ever. Truly inspiring.'),

-- Business posts comments
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Stabilizing inflation is good news, but we need to ensure it stays that way.'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'The central banks'' cautious approach seems prudent. Rushing could cause more problems.'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'I hope this translates to more stable prices for consumers. The cost of living has been challenging.'),

('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', 'Record highs are exciting, but I''m concerned about market volatility.'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'Strong corporate earnings are driving this rally. It''s good to see fundamentals supporting the market.'),
('660e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440004', 'I''m curious about which sectors are leading the gains. Diversification is still important.'),

('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', 'Major tech expansion is great for job creation. This could boost local economies significantly.'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'I hope this includes investment in training programs for local workers.'),
('660e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003', 'The environmental impact of these facilities should also be considered. Sustainable growth is important.'),

-- Science posts comments
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'Evidence of ancient water on Mars is fascinating. This could change our understanding of the planet.'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'This discovery supports the theory that Mars once had conditions suitable for life.'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'The geological implications are significant. This could inform future Mars exploration missions.'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', 'I''m excited about what this means for the search for extraterrestrial life.'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440005', 'The rover''s instruments are incredibly sophisticated. This is a testament to human engineering.'),

('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', 'Fusion energy breakthrough is huge! This could solve our energy problems once and for all.'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440002', 'The net energy gain is the key milestone. Now we need to scale it up commercially.'),
('660e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', 'This is clean, unlimited energy. The environmental benefits would be enormous.'),

('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440001', 'Deep ocean discoveries are always fascinating. We know so little about our own planet.'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440002', 'The adaptation strategies of deep-sea creatures could inform medical research.'),
('660e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440004', 'This shows the importance of ocean conservation. We''re still discovering new species.'),

-- World posts comments
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Trade agreements like this promote peace and prosperity. Economic cooperation reduces conflict.'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'I hope this includes provisions for labor rights and environmental protection.'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 'The economic benefits should be shared fairly among all participating countries.'),

('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440001', 'Peace treaties like this give hope for resolving other conflicts around the world.'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440002', 'The cultural exchange provisions are particularly important for long-term peace.'),
('660e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440004', 'This shows that diplomacy and negotiation can work even after decades of conflict.'),

('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440001', 'Climate commitments are crucial, but we need to ensure they''re actually implemented.'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440002', 'The funding for renewable energy is a positive step. This could accelerate the transition.'),
('660e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440003', 'I hope these commitments are legally binding and include clear accountability measures.');

-- Update vote counts and comment counts (triggers should handle this, but let's ensure they're correct)
UPDATE posts SET 
  true_votes = (SELECT COUNT(*) FROM votes WHERE post_id = posts.id AND vote_type = 'true'),
  fake_votes = (SELECT COUNT(*) FROM votes WHERE post_id = posts.id AND vote_type = 'fake'),
  neutral_votes = (SELECT COUNT(*) FROM votes WHERE post_id = posts.id AND vote_type = 'neutral'),
  vote_score = (SELECT COUNT(*) FROM votes WHERE post_id = posts.id AND vote_type = 'true') - 
               (SELECT COUNT(*) FROM votes WHERE post_id = posts.id AND vote_type = 'fake'),
  comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = posts.id);

-- Update user reputations based on their posts and votes received
UPDATE users SET reputation = 
  (SELECT COUNT(*) FROM posts WHERE author_id = users.id) * 10 +
  (SELECT COUNT(*) FROM votes v JOIN posts p ON v.post_id = p.id WHERE p.author_id = users.id) * 1;
