# Ollama Setup Guide

This guide explains how to set up Ollama for the sentiment analysis feature in the Journalist News Verification Dashboard.

## Overview

The sentiment analysis system now uses Ollama LLM models instead of Hugging Face. Ollama allows you to run large language models locally or on your own infrastructure, providing better privacy, control, and potentially lower costs.

## Installation

### Option 1: Local Installation

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Start Ollama Server**:
   ```bash
   ollama serve
   ```

3. **Pull Required Models**:
   ```bash
   # Pull the default model (recommended)
   ollama pull llama3.2:3b
   
   # Or pull a smaller, faster model
   ollama pull llama3.2:1b
   
   # Or pull a larger, more accurate model
   ollama pull llama3.2:8b
   ```

### Option 2: Cloud Hosting

For production deployments, consider using cloud-hosted Ollama instances:

1. **AWS/GCP/Azure**: Deploy Ollama on cloud instances
2. **Docker**: Use Ollama Docker containers
3. **Managed Services**: Use services like RunPod, Replicate, or similar

## Configuration

### Environment Variables

Set these environment variables before deploying:

```bash
# Ollama server URL (default: http://localhost:11434)
export OLLAMA_BASE_URL=http://your-ollama-server:11434

# Model to use (default: llama3.2:3b)
export OLLAMA_MODEL=llama3.2:3b
```

### Supabase Secrets

The deployment script will automatically set these as Supabase secrets:

```bash
# These are set automatically by the deployment script
supabase secrets set OLLAMA_BASE_URL=http://your-ollama-server:11434
supabase secrets set OLLAMA_MODEL=llama3.2:3b
```

## Model Recommendations

### For Development/Testing
- **llama3.2:1b**: Fast, lightweight, good for testing
- **llama3.2:3b**: Balanced performance and accuracy (recommended default)

### For Production
- **llama3.2:8b**: Higher accuracy, more resource-intensive
- **llama3.2:70b**: Maximum accuracy, requires significant resources

### Specialized Models
- **llama3.2:3b-instruct**: Better for instruction following
- **codellama:7b**: Good for code-related content analysis

## Deployment

1. **Ensure Ollama is Running**:
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Should return a list of available models
   ```

2. **Deploy the Function**:
   ```bash
   # Set configuration (optional)
   export OLLAMA_BASE_URL=http://localhost:11434
   export OLLAMA_MODEL=llama3.2:3b
   
   # Deploy
   ./deploy-sentiment-function.sh
   ```

## Testing

### Test Ollama Directly

```bash
# Test Ollama API directly
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Analyze this comment: This article is clearly fake news",
    "stream": false
  }'
```

### Test the Sentiment Function

```bash
# Test the deployed function
curl -X POST 'https://aaiqklqnzamkpxudrqhz.supabase.co/functions/v1/analyze-sentiment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text": "This is a credible source with solid evidence", "type": "comment"}'
```

## Performance Optimization

### Model Selection
- Use smaller models (1b-3b) for high-volume scenarios
- Use larger models (8b-70b) for maximum accuracy
- Consider using different models for different content types

### Server Configuration
- **CPU**: At least 4 cores recommended
- **RAM**: 8GB minimum, 16GB+ recommended for larger models
- **Storage**: SSD recommended for faster model loading

### Network Configuration
- Ensure low latency between Supabase and Ollama server
- Consider using the same region for both services
- Use HTTPS for production deployments

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   ```bash
   # Check if Ollama is running
   ps aux | grep ollama
   
   # Restart Ollama
   ollama serve
   ```

2. **Model Not Found**:
   ```bash
   # List available models
   ollama list
   
   # Pull the required model
   ollama pull llama3.2:3b
   ```

3. **Out of Memory**:
   - Use a smaller model
   - Increase server RAM
   - Close other applications

4. **Slow Performance**:
   - Use a smaller model
   - Ensure SSD storage
   - Check CPU usage

### Debug Mode

Enable debug logging in the Supabase function to see detailed information:

```typescript
// The function already includes console.log statements for debugging
console.log(`Calling Ollama API with model: ${OLLAMA_CONFIG.model}`)
console.log(`Ollama response: ${ollamaResponse}`)
```

## Security Considerations

### Network Security
- Use HTTPS in production
- Implement proper firewall rules
- Consider VPN or private networks

### Access Control
- Restrict Ollama server access
- Use authentication if needed
- Monitor API usage

### Data Privacy
- Ollama runs locally, keeping data private
- No data sent to external services
- Full control over model and data

## Cost Analysis

### Local Deployment
- **Hardware**: One-time cost for server/computer
- **Electricity**: Ongoing power costs
- **Maintenance**: Time for updates and monitoring

### Cloud Deployment
- **Compute**: Pay-per-use or reserved instances
- **Storage**: Model storage costs
- **Network**: Data transfer costs

### Comparison with Hugging Face
- **Hugging Face**: Pay-per-request, external dependency
- **Ollama**: Fixed costs, full control, better privacy

## Monitoring

### Health Checks
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Check model availability
ollama list
```

### Performance Monitoring
- Monitor response times
- Track memory usage
- Monitor CPU utilization
- Log error rates

## Backup and Recovery

### Model Backup
```bash
# Models are stored in ~/.ollama/models
# Backup this directory for disaster recovery
```

### Configuration Backup
- Save environment variables
- Document server configuration
- Keep deployment scripts in version control

## Scaling

### Horizontal Scaling
- Deploy multiple Ollama instances
- Use load balancer
- Implement health checks

### Vertical Scaling
- Upgrade server hardware
- Use more powerful models
- Optimize model parameters

## Support

### Resources
- [Ollama Documentation](https://ollama.ai/docs)
- [Model Library](https://ollama.ai/library)
- [Community Support](https://github.com/ollama/ollama)

### Getting Help
- Check Ollama logs: `ollama logs`
- Review Supabase function logs
- Test with simple prompts first
- Verify network connectivity

## Migration from Hugging Face

The migration is seamless:

1. **No Frontend Changes**: The API interface remains the same
2. **Same Response Format**: Sentiment analysis results are identical
3. **Better Performance**: Local models can be faster than API calls
4. **Enhanced Privacy**: No data leaves your infrastructure
5. **Cost Control**: Predictable costs vs. per-request pricing

The system automatically falls back to keyword-based analysis if Ollama is unavailable, ensuring reliability.
