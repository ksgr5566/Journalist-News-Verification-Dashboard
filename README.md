
# Journalist News Verification Dashboard

This is a code bundle for Journalist News Verification Dashboard. The original project is available at https://www.figma.com/design/pCem4USVo2zfjI8n4bIGQJ/Journalist-News-Verification-Dashboard.

## Features

- **News Verification Platform**: Community-driven news verification with voting system
- **AI-Powered Sentiment Analysis**: Uses Ollama LLM models for intelligent comment and post analysis
- **Real-time Updates**: Live sentiment analysis and verification status updates
- **User Reputation System**: Gamified reputation system for contributors
- **Topic-based Organization**: News organized by categories (Politics, Technology, Health, etc.)

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Sentiment Analysis Setup

The dashboard includes AI-powered sentiment analysis using Ollama. See [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for detailed setup instructions.

### Quick Start

1. Install Ollama: `brew install ollama` (macOS) or visit [ollama.ai](https://ollama.ai)
2. Start Ollama: `ollama serve`
3. Pull a model: `ollama pull llama3.2:3b`
4. Deploy the function: `./deploy-sentiment-function.sh`

## Documentation

- [Sentiment Analysis Features](./SENTIMENT_ANALYSIS.md) - Detailed documentation of the AI sentiment analysis system
- [Ollama Setup Guide](./OLLAMA_SETUP.md) - Complete guide for setting up Ollama
- [Database Schema](./database-schema.sql) - Database structure and relationships
  