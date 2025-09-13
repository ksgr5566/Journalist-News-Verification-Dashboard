# Sentiment Analysis Features

This document describes the sentiment analysis features added to the Journalist News Verification Dashboard.

## Overview

The sentiment analysis system uses Ollama LLM models to analyze comments and posts, determining their stance on news verification and helping to improve the accuracy of truth/fake news classification. The system provides intelligent, context-aware analysis with fallback mechanisms for reliability.

## Features

### 1. Comment Sentiment Analysis

Each comment is automatically analyzed to determine if it:
- **Supporting**: Comments that support the post as true news
- **Claiming Fake**: Comments that claim the post is fake news
- **Neutral**: Comments that don't clearly support or claim fake

#### Sentiment Tags
- 🟢 **Supporting**: Green badge with checkmark icon
- 🔴 **Claiming Fake**: Red badge with X icon  
- ⚪ **Neutral**: Gray badge with alert icon

### 2. Post Verification Status Enhancement

The verification status now combines:
- **Community Votes** (60% weight): User votes (true/fake/neutral)
- **AI Sentiment Analysis** (40% weight): Analysis of comment sentiment

#### Combined Verification Display
- Shows overall verification status with confidence percentage
- Breaks down individual components (votes vs sentiment)
- Provides transparency in decision-making

### 3. Database Schema Updates

#### Comments Table
```sql
-- Sentiment analysis fields
sentiment_score REAL DEFAULT 0.0, -- -1.0 to 1.0 (negative to positive)
sentiment_label TEXT CHECK (sentiment_label IN ('supporting', 'claiming_fake', 'neutral')),
sentiment_confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
analyzed_at TIMESTAMP WITH TIME ZONE
```

#### Posts Table
```sql
-- Sentiment analysis fields for overall post sentiment
overall_sentiment_score REAL DEFAULT 0.0, -- -1.0 to 1.0 (negative to positive)
overall_sentiment_label TEXT CHECK (overall_sentiment_label IN ('true', 'fake', 'neutral')),
overall_sentiment_confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
sentiment_analyzed_at TIMESTAMP WITH TIME ZONE
```

## Implementation

### 1. Supabase Edge Function

The sentiment analysis is powered by a Supabase Edge Function located at:
```
supabase/functions/analyze-sentiment/index.ts
```

#### Function Features
- **Ollama LLM Integration**: Uses local or cloud-hosted Ollama models for intelligent analysis
- **Specialized Prompts**: Custom prompts designed for news verification and comment analysis
- **Fallback Analysis**: Enhanced keyword-based analysis if Ollama is unavailable
- **Confidence Scoring**: Provides confidence levels for all analyses
- **Support for both comments and posts**: Different analysis approaches for different content types
- **CORS-enabled**: Ready for web requests

#### Ollama Models Used
- **Primary Model**: `llama3.2:3b` - Balanced performance and accuracy
- **Alternative Model**: `llama3.2:1b` - Faster processing for high-volume scenarios
- **Configurable**: Any Ollama-compatible model can be used

#### Deployment
```bash
# Set up Ollama configuration (optional - defaults provided)
export OLLAMA_BASE_URL=http://your-ollama-server:11434
export OLLAMA_MODEL=llama3.2:3b

# Deploy the function
./deploy-sentiment-function.sh
```

#### Ollama Setup
1. Install Ollama on your server or use a cloud-hosted instance
2. Pull the desired model: `ollama pull llama3.2:3b`
3. Start the Ollama server: `ollama serve`
4. Configure the base URL and model as environment variables or Supabase secrets

### 2. Frontend Integration

#### Comment Submission
- Automatically analyzes sentiment when comments are submitted
- Updates database with sentiment results
- Displays sentiment tags in real-time

#### Verification Status
- Calculates combined verification status
- Shows breakdown of vote vs sentiment analysis
- Updates dynamically as new data comes in

### 3. API Functions

#### `analyzeSentiment(text, type)`
Analyzes text sentiment using the Supabase Edge Function.

#### `analyzeCommentSentiment(commentId, content)`
Analyzes comment sentiment and updates the database.

#### `analyzePostSentiment(postId, title, description)`
Analyzes post sentiment and updates the database.

## Algorithm Details

### Ollama LLM Integration

The sentiment analysis uses Ollama's local language models for intelligent analysis:

#### Primary Analysis (Ollama Models)
1. **Prompt Engineering**: Creates specialized prompts for news verification
2. **API Call**: Sends text to Ollama API with optimized parameters
3. **Response Parsing**: Extracts sentiment labels from LLM responses
4. **Confidence Scoring**: Calculates confidence based on response quality and text characteristics
5. **News-Specific Enhancement**: Applies additional logic for news verification

#### Fallback Analysis (Enhanced Keywords)
If Ollama models are unavailable, uses an enhanced keyword-based approach:

##### Supporting Keywords (Weighted)
- High weight: credible(2), reliable(2), verified(3), confirmed(3), evidence(3), proof(3)
- Medium weight: accurate(2), factual(2), documented(2), legitimate(2), authentic(2)
- Low weight: believable(1), convincing(1), solid(1), valid(1), genuine(1)

##### Fake Keywords (Weighted)
- High weight: fake(3), hoax(3), scam(3), fraud(3), manipulated(3), doctored(3)
- Medium weight: false(2), misleading(2), deceptive(2), unreliable(2), suspicious(2)
- Low weight: doubtful(1), questionable(1), wrong(1), incorrect(1)

##### Neutral Keywords (Weighted)
- High weight: uncertain(2), unclear(1), skeptical(2), doubt(2), not sure(2)
- Low weight: maybe(1), perhaps(1), possibly(1), might(1), could(1)

### Scoring System

#### Ollama Model Scoring
1. **LLM Response**: Receives structured responses from Ollama models
2. **Label Parsing**: Extracts sentiment labels from natural language responses
3. **News Enhancement**: Applies additional logic for news-specific indicators
4. **Confidence**: Calculates confidence based on response quality and text characteristics

#### Fallback Scoring
1. **Weighted Matching**: Count weighted matches for each category
2. **Score Calculation**: `(supporting_weight - fake_weight) / total_weight`
3. **Confidence**: Based on total keyword weight found
4. **Thresholds**: Higher thresholds for more accurate classification

### Combined Verification

```javascript
const voteWeight = 0.6; // 60% weight for votes
const sentimentWeight = 0.4; // 40% weight for sentiment

const combinedScore = (voteScore * voteWeight) + (sentimentScore * sentimentWeight);
```

## Usage Examples

### Testing the API

```bash
# Test with Ollama model (requires Ollama server running)
curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "This is a credible source with solid evidence", "type": "comment"}'
```

### Response Format

```json
{
  "sentiment_score": 0.8,
  "sentiment_label": "supporting",
  "sentiment_confidence": 0.9
}
```

### Example Test Cases

```bash
# Supporting comment
curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "This article is well-researched and provides credible evidence", "type": "comment"}'

# Claiming fake comment  
curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "This is clearly fake news and misleading information", "type": "comment"}'

# Neutral comment
curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "I need more information to form an opinion", "type": "comment"}'
```

## Future Enhancements

1. **Advanced Ollama Models**: Integrate specialized models for fake news detection
2. **Context Awareness**: Consider post content when analyzing comments
3. **User Reputation**: Weight sentiment analysis by user reputation
4. **Real-time Updates**: WebSocket integration for live sentiment updates
5. **Advanced Analytics**: Sentiment trends and patterns over time
6. **Multi-language Support**: Support for multiple languages using multilingual Ollama models
7. **Custom Model Fine-tuning**: Fine-tune Ollama models on domain-specific news verification data
8. **Model Selection**: Dynamic model selection based on content type and complexity

## Troubleshooting

### Common Issues

1. **Function Not Deployed**: Run the deployment script
2. **CORS Errors**: Ensure function has proper CORS headers
3. **Database Updates**: Check if sentiment fields exist in database
4. **Ollama Connection Errors**: Check if Ollama server is running and accessible
5. **Low Confidence**: Ollama models provide better accuracy than keyword fallback
6. **Model Not Found**: Ensure the specified Ollama model is installed
7. **Network Issues**: Check network connectivity between Supabase and Ollama server

### Debug Mode

Enable debug logging in the browser console to see sentiment analysis results:
```javascript
localStorage.setItem('debug', 'sentiment');
```
