# AI-Powered Personalized News Digest Platform

A production-ready MVP for personalized news aggregation with advanced AI features including bias detection, content quality scoring, and neutral summarization.

## 🚀 Features

### 📊 **Data Ingestion & Normalization**
- Multi-source news aggregation (NewsAPI, Guardian, extensible for more)
- Smart deduplication by URL and content hash
- Reliable image extraction with OpenGraph/Twitter meta fallbacks
- Comprehensive content normalization and validation

### 🛡️ **Content Quality & Safety**
- **Bias Detection**: AI-powered political bias scoring (-1 to +1 scale)
- **Toxicity Filtering**: Automatic detection and filtering of harmful content
- **Factuality Scoring**: AI assessment of content accuracy and reliability
- **Sensationalism Detection**: Identification of clickbait and inflammatory content
- **Hard Filters**: Automatic removal of spam, NSFW, hate speech, and low-quality content

### 🧠 **AI-Powered Content Analysis**
- **Neutral Summarization**: Two formats (30-word blurb + 3 key points)
- **Political Balance Mode**: Diversifies perspectives across political spectrum  
- **Content Quality Scoring**: Comprehensive 8-factor analysis
- **Entity & Topic Extraction**: Automated categorization and tagging

### 🎯 **Advanced Personalization**
- **Hybrid Recommendation Engine**: Content-based + collaborative filtering
- **Real-time Learning**: Adapts from likes, shares, reading time, bookmarks
- **Exploration Control**: User-configurable discovery vs. personalization ratio
- **Cold Start Solutions**: Interest-based onboarding for new users
- **Dynamic Preferences**: Topic muting, source blocking, balanced feeds

### 📱 **Image-First Reels UI**
- **Masonry Grid Layout**: Beautiful image-first card design
- **Infinite Scroll**: Seamless content loading with skeleton states  
- **Interactive Actions**: Like, bookmark, share, mute topic controls
- **Keyboard Navigation**: Full accessibility with arrow keys
- **Smart Auto-Refresh**: Position-aware updates with toast notifications
- **Settings Drawer**: Comprehensive personalization controls

### 🔄 **Dynamic Content Updates**
- **Smart Auto-Refresh**: Fetches only new content since last update
- **Position-Aware Loading**: Shows toasts when scrolled, auto-inserts when at top
- **Incremental Updates**: Efficient `since` parameter for minimal bandwidth usage
- **Persistent Actions**: User interactions preserved during refresh cycles

### 📈 **Observability & Quality Assurance**
- **Content Quality Dashboard**: Real-time metrics and analytics
- **Aggregation Logs**: Detailed tracking of ingestion performance
- **Quality Threshold Configuration**: Adjustable AI scoring parameters
- **A/B Testing Ready**: Feature flags for summary length, explore ratio
- **Performance Monitoring**: Success rates, rejection reasons, latency tracking

## 🏗️ **Architecture**

### **Backend Stack**
- **Database**: PostgreSQL with Supabase (Row Level Security enabled)
- **Edge Functions**: Deno-based serverless functions for AI processing
- **AI Integration**: OpenAI GPT-4.1 for content analysis and summarization
- **Real-time**: Supabase real-time subscriptions for live updates

### **Frontend Stack**  
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks + Supabase client
- **Routing**: React Router with protected routes

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+ 
- Supabase account
- OpenAI API key
- News API key
- Guardian API key

### Environment Setup
Create a `.env.local` file:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys (configured in Supabase Edge Functions)
OPENAI_API_KEY=your_openai_api_key
NEWS_API_KEY=your_news_api_key  
GUARDIAN_API_KEY=your_guardian_api_key
```

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build
```

### Database Setup
The database schema and RLS policies are automatically created via Supabase migrations. Key tables include:

- `articles` - Main news articles with AI scores
- `user_preferences` - Personalization settings
- `article_interactions` - User engagement tracking
- `user_recommendations` - AI-generated recommendations  
- `aggregation_logs` - Content ingestion monitoring
- `content_quality_config` - Adjustable quality thresholds

## 🎛️ **Configuration**

### Content Quality Thresholds
Access the admin dashboard at `/admin/content-quality` to configure:

- **Toxicity Threshold**: 0.4 (articles above this are rejected)
- **Bias Threshold**: 0.7 (flagged for balanced feeds) 
- **Sensationalism Threshold**: 0.65 (combined with factuality)
- **Minimum Factuality**: 0.45 (required accuracy score)
- **Content Quality**: 0.4 (overall quality threshold)
- **Source Credibility**: 0.3 (minimum credibility requirement)

### Personalization Settings
Users can adjust via the settings drawer:

- **Political Balance Mode**: Enable perspective diversity
- **Exploration Ratio**: 5-70% discovery vs. personalization
- **Auto-Refresh**: 1-15 minute intervals
- **Content Filtering**: Mute topics and block sources

## 📊 **API Endpoints**

### Edge Functions
- `GET /multi-source-news-aggregator` - Pull and process news from multiple sources
- `POST /enhanced-content-analyzer` - AI content quality and bias analysis  
- `POST /ai-personalized-recommendations` - Generate user-specific recommendations
- `POST /process-user-feedback` - Handle user interactions and feedback

### Key Parameters
```typescript
// Multi-source aggregation
{
  sources: ['newsapi', 'guardian'],
  category: 'general' | 'politics' | 'technology' | 'sports',
  limit: 50,
  forceRefresh: true
}

// Personalized recommendations  
{
  userId: string,
  limit: 30,
  since?: ISO_timestamp,
  balancedMode: boolean,
  exploreRatio: 0.25,
  mutedTopics: string[]
}
```

## 🧪 **Testing**

### Content Quality Testing
Test the AI content analyzer:
```bash
# Run content through quality filters
curl -X POST /functions/v1/enhanced-content-analyzer \\
  -d '{"title": "Test Article", "content": "...", "source_name": "Test Source"}'
```

### Aggregation Testing  
Trigger multi-source news pull:
```bash
# Aggregate from all sources
curl -X POST /functions/v1/multi-source-news-aggregator \\
  -d '{"sources": ["newsapi", "guardian"], "limit": 20}'
```

## 🎯 **Production Deployment**

### Performance Optimizations
- **Image Lazy Loading**: Intersection Observer API
- **Infinite Scroll**: Efficient DOM management
- **Caching**: Smart timestamp-based incremental updates
- **Real-time**: Optimized Supabase subscriptions

### Security Features
- **Row Level Security**: User data isolation
- **Content Sanitization**: XSS prevention
- **API Rate Limiting**: Per-user request throttling
- **Secret Management**: Encrypted environment variables

### Monitoring & Analytics
- **Quality Metrics**: Content success rates and rejection reasons
- **User Engagement**: Reading patterns and interaction analytics  
- **Performance Tracking**: API latency and error rates
- **A/B Testing**: Feature flag infrastructure

## 🤝 **Contributing**

### Adding News Sources
Extend the `multi-source-news-aggregator` function:

```typescript
const newsSources = {
  'your-source': {
    name: 'Your News Source',
    fetchFunction: (category, limit) => fetchYourSource(category, limit)
  }
}
```

### Customizing AI Analysis
Modify prompts in `enhanced-content-analyzer` for:
- Custom bias detection criteria
- Domain-specific quality metrics
- Alternative summarization formats
- Additional content scoring factors

### UI Customization
The design system is fully themeable via:
- `src/index.css` - Semantic color tokens
- `tailwind.config.ts` - Design system configuration
- `src/components/ui/` - Reusable component library

## 📚 **Documentation**

- **API Reference**: Complete endpoint documentation with examples
- **Database Schema**: ERD and table relationships
- **AI Model Guide**: Content analysis and scoring methodology
- **Deployment Guide**: Production setup and scaling considerations

## 🔧 **Troubleshooting**

### Common Issues
- **Empty Feed**: Check API keys and run aggregation manually
- **Quality Scores Missing**: Ensure OpenAI API key is configured
- **Real-time Not Working**: Verify Supabase RLS policies
- **Images Not Loading**: Check CORS settings and image URLs

### Debug Tools
- Admin dashboard for quality metrics
- Aggregation logs for ingestion monitoring  
- Browser developer tools for network debugging
- Supabase dashboard for database inspection

---

Built with ❤️ for the future of personalized, unbiased news consumption.