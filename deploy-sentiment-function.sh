#!/bin/bash

# Deploy sentiment analysis edge function to Supabase
# Make sure you have the Supabase CLI installed and are logged in

echo "Deploying sentiment analysis edge function to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "Error: Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

# Check Ollama configuration
echo "Checking Ollama configuration..."

# Set default Ollama configuration if not provided
if [ -z "$OLLAMA_BASE_URL" ]; then
    echo "⚠️  OLLAMA_BASE_URL not set. Using default: http://localhost:11434"
    echo "To use a different Ollama server, set:"
    echo "export OLLAMA_BASE_URL=http://your-ollama-server:11434"
    echo ""
fi

if [ -z "$OLLAMA_MODEL" ]; then
    echo "⚠️  OLLAMA_MODEL not set. Using default: llama3.2:3b"
    echo "To use a different model, set:"
    echo "export OLLAMA_MODEL=your-preferred-model"
    echo ""
fi

# Set Ollama configuration as Supabase secrets
echo "Setting Ollama configuration as Supabase secrets..."
supabase secrets set OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
supabase secrets set OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

echo "✅ Ollama configuration set successfully!"
echo ""
echo "Note: Make sure your Ollama server is running and accessible from Supabase Edge Functions."
echo "For production deployment, consider using a cloud-hosted Ollama instance."

# Deploy the edge function
echo "Deploying edge function..."
supabase functions deploy analyze-sentiment

if [ $? -eq 0 ]; then
    echo "✅ Sentiment analysis function deployed successfully!"
    echo ""
    echo "The function is now available at:"
    echo "https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment"
    echo ""
    echo "Features:"
    echo "- Uses Ollama LLM models for intelligent sentiment analysis"
    echo "- Specialized prompts for news verification and comment analysis"
    echo "- Fallback to enhanced keyword analysis if Ollama is unavailable"
    echo "- Supports both comment and post analysis"
    echo "- Returns confidence scores and sentiment labels"
    echo ""
    echo "Configuration:"
    echo "- Ollama Base URL: ${OLLAMA_BASE_URL:-http://localhost:11434}"
    echo "- Ollama Model: ${OLLAMA_MODEL:-llama3.2:3b}"
    echo ""
    echo "You can test it with:"
    echo "curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \\"
    echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"text\": \"This is a credible source with solid evidence\", \"type\": \"comment\"}'"
    echo ""
    echo "Expected response:"
    echo '{"sentiment_score": 0.8, "sentiment_label": "supporting", "sentiment_confidence": 0.9}'
    echo ""
    echo "⚠️  Important: Make sure your Ollama server is running and accessible!"
    echo "For production, consider using a cloud-hosted Ollama instance."
else
    echo "❌ Failed to deploy sentiment analysis function"
    exit 1
fi
