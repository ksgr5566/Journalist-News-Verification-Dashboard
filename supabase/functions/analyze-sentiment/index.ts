import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SentimentRequest {
  text: string
  type: 'comment' | 'post'
}

interface SentimentResponse {
  sentiment_score: number
  sentiment_label: string
  sentiment_confidence: number
}

interface OllamaResponse {
  response: string
  done: boolean
}

// Configuration for Ollama models
const OLLAMA_CONFIG = {
  // Ollama server URL - can be configured via environment variable
  baseUrl: Deno.env.get('OLLAMA_BASE_URL') || 'http://localhost:11434',
  // Model to use for sentiment analysis
  model: Deno.env.get('OLLAMA_MODEL') || 'llama3.2:3b',
  // Alternative models for different use cases
  alternativeModel: 'llama3.2:1b',
  // Specialized model for news analysis (if available)
  newsModel: 'llama3.2:3b'
}

// Call Ollama API for sentiment analysis
async function callOllamaAPI(text: string, type: 'comment' | 'post'): Promise<string> {
  const ollamaUrl = `${OLLAMA_CONFIG.baseUrl}/api/generate`
  
  // Create a specialized prompt for news verification sentiment analysis
  const prompt = createSentimentPrompt(text, type)
  
  console.log(`Calling Ollama API with model: ${OLLAMA_CONFIG.model}`)
  console.log(`Prompt: ${prompt}`)

  const response = await fetch(ollamaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistent results
        top_p: 0.9,
        max_tokens: 150
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
  }

  const result: OllamaResponse = await response.json()
  return result.response.trim()
}

// Create specialized prompts for different content types
function createSentimentPrompt(text: string, type: 'comment' | 'post'): string {
  if (type === 'comment') {
    return `Analyze the sentiment of this comment about a news article. Determine if the comment is:
1. SUPPORTING - The comment supports the article as true/credible
2. CLAIMING_FAKE - The comment claims the article is fake/misleading
3. NEUTRAL - The comment is neutral or unclear

Comment: "${text}"

Respond with ONLY one of these three labels: SUPPORTING, CLAIMING_FAKE, or NEUTRAL`
  } else {
    return `Analyze this news article to determine its likely veracity. Consider the content, tone, and credibility indicators. Determine if the article is:
1. TRUE - The article appears to be factual and credible
2. FAKE - The article appears to be fake, misleading, or unreliable
3. NEUTRAL - The article's veracity is unclear or mixed

Article: "${text}"

Respond with ONLY one of these three labels: TRUE, FAKE, or NEUTRAL`
  }
}

// Enhanced sentiment analysis using Ollama
async function analyzeSentiment(text: string, type: 'comment' | 'post'): Promise<SentimentResponse> {
  try {
    console.log(`Analyzing sentiment for ${type} using Ollama`)
    
    // Call Ollama API for sentiment analysis
    const ollamaResponse = await callOllamaAPI(text, type)
    
    console.log(`Ollama response: ${ollamaResponse}`)
    
    // Parse the Ollama response
    const sentimentLabel = parseOllamaResponse(ollamaResponse, type)
    
    // Calculate confidence and score based on the response
    const { sentimentScore, confidence } = calculateSentimentMetrics(sentimentLabel, text, type)
    
    // Apply additional news verification logic
    const enhancedResult = enhanceWithNewsVerificationLogic(sentimentLabel, sentimentScore, confidence, text, type)
    
    return {
      sentiment_score: Math.max(-1, Math.min(1, enhancedResult.sentimentScore)),
      sentiment_label: enhancedResult.sentimentLabel,
      sentiment_confidence: Math.max(0.1, Math.min(1, enhancedResult.confidence))
    }
    
  } catch (error) {
    console.error('Ollama analysis failed:', error)
    
    // Fallback to a more sophisticated keyword-based analysis
    return fallbackSentimentAnalysis(text, type)
  }
}

// Parse Ollama response to extract sentiment label
function parseOllamaResponse(response: string, type: 'comment' | 'post'): string {
  const cleanResponse = response.toLowerCase().trim()
  
  if (type === 'comment') {
    if (cleanResponse.includes('supporting')) {
      return 'supporting'
    } else if (cleanResponse.includes('claiming_fake') || cleanResponse.includes('claiming fake')) {
      return 'claiming_fake'
    } else if (cleanResponse.includes('neutral')) {
      return 'neutral'
    }
  } else {
    if (cleanResponse.includes('true')) {
      return 'true'
    } else if (cleanResponse.includes('fake')) {
      return 'fake'
    } else if (cleanResponse.includes('neutral')) {
      return 'neutral'
    }
  }
  
  // Default fallback
  return type === 'comment' ? 'neutral' : 'neutral'
}

// Calculate sentiment metrics based on the parsed label
function calculateSentimentMetrics(sentimentLabel: string, text: string, type: 'comment' | 'post'): { sentimentScore: number, confidence: number } {
  let sentimentScore = 0
  let confidence = 0.7 // Base confidence for Ollama responses
  
  // Set base sentiment score based on label
  switch (sentimentLabel) {
    case 'supporting':
    case 'true':
      sentimentScore = 0.8
      break
    case 'claiming_fake':
    case 'fake':
      sentimentScore = -0.8
      break
    case 'neutral':
    default:
      sentimentScore = 0
      confidence = 0.5 // Lower confidence for neutral
      break
  }
  
  // Adjust confidence based on text length and content
  const textLength = text.length
  if (textLength < 20) {
    confidence *= 0.7 // Lower confidence for very short text
  } else if (textLength > 200) {
    confidence *= 1.1 // Slightly higher confidence for longer text
  }
  
  return { sentimentScore, confidence }
}

// Enhance results with news verification logic
function enhanceWithNewsVerificationLogic(
  sentimentLabel: string, 
  sentimentScore: number, 
  confidence: number, 
  text: string, 
  type: 'comment' | 'post'
): { sentimentLabel: string, sentimentScore: number, confidence: number } {
  
  const fakeNewsIndicators = [
    'fake', 'false', 'misleading', 'hoax', 'scam', 'fraud', 'manipulated',
    'doctored', 'photoshopped', 'staged', 'fabricated', 'made up', 'unreliable',
    'conspiracy', 'propaganda', 'disinformation', 'misinformation'
  ]
  
  const supportingIndicators = [
    'credible', 'reliable', 'verified', 'confirmed', 'accurate', 'factual',
    'evidence', 'proof', 'documented', 'legitimate', 'authentic', 'trustworthy',
    'peer-reviewed', 'scientific', 'official', 'authoritative'
  ]
  
  const lowerText = text.toLowerCase()
  
  const fakeCount = fakeNewsIndicators.filter(indicator => lowerText.includes(indicator)).length
  const supportingCount = supportingIndicators.filter(indicator => lowerText.includes(indicator)).length
  
  // If we have strong keyword indicators, adjust the sentiment
  if (fakeCount > supportingCount && fakeCount > 0) {
    const newLabel = type === 'comment' ? 'claiming_fake' : 'fake'
    const newScore = -Math.max(Math.abs(sentimentScore), 0.8)
    const newConfidence = Math.max(confidence, 0.8)
    
    return {
      sentimentLabel: newLabel,
      sentimentScore: newScore,
      confidence: newConfidence
    }
  } else if (supportingCount > fakeCount && supportingCount > 0) {
    const newLabel = type === 'comment' ? 'supporting' : 'true'
    const newScore = Math.max(Math.abs(sentimentScore), 0.8)
    const newConfidence = Math.max(confidence, 0.8)
    
    return {
      sentimentLabel: newLabel,
      sentimentScore: newScore,
      confidence: newConfidence
    }
  }
  
  // Return original results if no strong keyword indicators
  return {
    sentimentLabel,
    sentimentScore,
    confidence
  }
}

// Fallback sentiment analysis (improved from the original)
function fallbackSentimentAnalysis(text: string, type: 'comment' | 'post'): SentimentResponse {
  const lowerText = text.toLowerCase()
  
  // Enhanced keyword sets with weights
  const supportingKeywords = {
    'credible': 2, 'reliable': 2, 'verified': 3, 'confirmed': 3, 'accurate': 2, 'true': 1, 'factual': 2,
    'evidence': 3, 'proof': 3, 'documented': 2, 'legitimate': 2, 'authentic': 2, 'trustworthy': 2,
    'believable': 1, 'convincing': 1, 'solid': 1, 'valid': 1, 'genuine': 1, 'real': 1
  }
  
  const fakeKeywords = {
    'fake': 3, 'false': 2, 'misleading': 2, 'deceptive': 2, 'unreliable': 2, 'doubtful': 1, 'suspicious': 2,
    'questionable': 1, 'inaccurate': 2, 'wrong': 1, 'incorrect': 1, 'hoax': 3, 'scam': 3, 'fraud': 3,
    'manipulated': 3, 'doctored': 3, 'photoshopped': 3, 'staged': 2, 'fabricated': 3, 'made up': 2
  }
  
  const neutralKeywords = {
    'maybe': 1, 'perhaps': 1, 'possibly': 1, 'might': 1, 'could': 1, 'uncertain': 2, 'unclear': 1,
    'skeptical': 2, 'doubt': 2, 'question': 1, 'wonder': 1, 'not sure': 2, 'need more info': 2,
    'wait and see': 1, 'time will tell': 1, 'jury is out': 1
  }
  
  let supportingScore = 0
  let fakeScore = 0
  let neutralScore = 0
  
  // Calculate weighted scores
  Object.entries(supportingKeywords).forEach(([keyword, weight]) => {
    if (lowerText.includes(keyword)) {
      supportingScore += weight
    }
  })
  
  Object.entries(fakeKeywords).forEach(([keyword, weight]) => {
    if (lowerText.includes(keyword)) {
      fakeScore += weight
    }
  })
  
  Object.entries(neutralKeywords).forEach(([keyword, weight]) => {
    if (lowerText.includes(keyword)) {
      neutralScore += weight
    }
  })
  
  const totalScore = supportingScore + fakeScore + neutralScore
  let sentimentScore = 0
  let sentimentLabel = 'neutral'
  let confidence = 0.3 // Lower confidence for fallback
  
  if (totalScore > 0) {
    sentimentScore = (supportingScore - fakeScore) / totalScore
    confidence = Math.min(totalScore / 10, 0.8) // Cap confidence for fallback
    
    if (sentimentScore > 0.2) {
      sentimentLabel = type === 'comment' ? 'supporting' : 'true'
    } else if (sentimentScore < -0.2) {
      sentimentLabel = type === 'comment' ? 'claiming_fake' : 'fake'
    } else {
      sentimentLabel = 'neutral'
    }
  }
  
  return {
    sentiment_score: Math.max(-1, Math.min(1, sentimentScore)),
    sentiment_label: sentimentLabel,
    sentiment_confidence: Math.max(0.1, Math.min(1, confidence))
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, type }: SentimentRequest = await req.json()
    
    if (!text || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text and type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (type !== 'comment' && type !== 'post') {
      return new Response(
        JSON.stringify({ error: 'Type must be either "comment" or "post"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const result = await analyzeSentiment(text, type)
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Error analyzing sentiment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
