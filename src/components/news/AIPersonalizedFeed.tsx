import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Bookmark, Share2, Eye, ThumbsDown, AlertTriangle, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Article {
  id: string;
  title: string;
  description: string;
  ai_summary: string;
  url: string;
  url_to_image: string | null;
  source_name: string;
  created_at: string;
  topic_tags: string[];
  bias_score: number;
  credibility_score: number;
  sentiment_score: number;
  content_quality_score: number;
  reading_time_minutes: number;
  engagement_score: number;
  categories: { name: string; color: string } | null;
}

interface Recommendation {
  article_id: string;
  recommendation_score: number;
  recommendation_reason: string;
  algorithm_used: string;
  articles: Article;
}

export default function AIPersonalizedFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    if (user) {
      fetchPersonalizedRecommendations();
    }
  }, [user]);

  const fetchPersonalizedRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First, try to get existing recommendations
      const { data: existingRecs } = await supabase
        .from('user_recommendations')
        .select(`
          *,
          articles (
            *,
            categories (name, color)
          )
        `)
        .eq('user_id', user.id)
        .order('recommendation_score', { ascending: false })
        .limit(10);

      if (existingRecs && existingRecs.length > 0) {
        setRecommendations(existingRecs);
      }

      // Generate fresh recommendations in background
      const { error } = await supabase.functions.invoke('ai-personalized-recommendations', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Error generating recommendations:', error);
      } else {
        // Fetch updated recommendations
        const { data: newRecs } = await supabase
          .from('user_recommendations')
          .select(`
            *,
            articles (
              *,
              categories (name, color)
            )
          `)
          .eq('user_id', user.id)
          .order('recommendation_score', { ascending: false })
          .limit(10);

        if (newRecs) {
          setRecommendations(newRecs);
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load personalized recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (articleId: string, feedbackType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('process-user-feedback', {
        body: {
          userId: user.id,
          articleId,
          feedbackType
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Feedback recorded",
        description: "Your preferences have been updated to improve future recommendations.",
      });

      // Refresh recommendations after feedback
      setTimeout(() => {
        fetchPersonalizedRecommendations();
      }, 1000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive"
      });
    }
  };

  const getBiasIndicator = (score: number) => {
    if (score <= 0.3) return { color: 'bg-red-500', label: 'High Bias' };
    if (score <= 0.6) return { color: 'bg-yellow-500', label: 'Some Bias' };
    return { color: 'bg-green-500', label: 'Low Bias' };
  };

  const getCredibilityIndicator = (score: number) => {
    if (score <= 0.4) return { color: 'bg-red-500', label: 'Low' };
    if (score <= 0.7) return { color: 'bg-yellow-500', label: 'Medium' };
    return { color: 'bg-green-500', label: 'High' };
  };

  const formatScore = (score: number) => Math.round(score * 100);

  if (!user) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Personalization</h3>
          <p className="text-muted-foreground mb-4">
            Sign in to get personalized news recommendations powered by AI
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">AI-Powered News Feed</h2>
        <Badge variant="secondary" className="ml-2">
          Personalized for you
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personalized">
            <Sparkles className="w-4 h-4 mr-2" />
            For You
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="w-4 h-4 mr-2" />
            Latest
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="space-y-6">
          {loading ? (
            <div className="grid gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Building Your Personalized Feed</h3>
                <p className="text-muted-foreground mb-4">
                  Start reading articles to help our AI learn your preferences
                </p>
                <Button onClick={fetchPersonalizedRecommendations}>
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {recommendations.map((rec) => {
                const article = rec.articles;
                const biasIndicator = getBiasIndicator(article.bias_score || 0.5);
                const credibilityIndicator = getCredibilityIndicator(article.credibility_score || 0.7);

                return (
                  <Card key={rec.article_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 line-clamp-2">
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                            >
                              {article.title}
                            </a>
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>{article.source_name}</span>
                            <span>•</span>
                            <span>{article.reading_time_minutes} min read</span>
                            <span>•</span>
                            <span>{formatScore(rec.recommendation_score)}% match</span>
                          </div>
                        </div>
                        {article.url_to_image && (
                          <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={article.url_to_image} 
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {article.categories && (
                          <Badge variant="outline" style={{ borderColor: article.categories.color }}>
                            {article.categories.name}
                          </Badge>
                        )}
                        {article.topic_tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${biasIndicator.color}`}></div>
                          <span>Bias: {biasIndicator.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${credibilityIndicator.color}`}></div>
                          <span>Credibility: {credibilityIndicator.label}</span>
                        </div>
                        <span>Quality: {formatScore(article.content_quality_score || 0.7)}%</span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <CardDescription className="text-sm mb-4 line-clamp-3">
                        {article.ai_summary || article.description}
                      </CardDescription>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, 'like')}
                            className="h-8 px-2"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, 'bookmark')}
                            className="h-8 px-2"
                          >
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, 'share')}
                            className="h-8 px-2"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, 'dislike')}
                            className="h-8 px-2"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Recommended because: {rec.recommendation_reason}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending">
          <Card>
            <CardContent className="text-center p-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Trending News</h3>
              <p className="text-muted-foreground">
                This feature will show trending articles based on engagement across all users
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardContent className="text-center p-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Latest News</h3>
              <p className="text-muted-foreground">
                This feature will show the most recent articles from your preferred sources
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}