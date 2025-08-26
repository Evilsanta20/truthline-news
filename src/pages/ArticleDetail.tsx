import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, ExternalLink, Share2, Bookmark, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PersonalizedArticle } from '@/hooks/usePersonalization';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<PersonalizedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;

      try {
        // Extract article database ID from URL
        const articleId = id.split('-')[0];
        
        const { data, error } = await supabase
          .from('articles')
          .select(`
            *,
            categories (name, slug, color)
          `)
          .eq('id', articleId)
          .single();

        if (error) {
          console.error('Error fetching article:', error);
          return;
        }

        if (data) {
          setArticle({
            ...data,
            recommendation_score: data.engagement_score || 50
          });

          // Track view interaction
          if (user) {
            await supabase
              .from('article_interactions')
              .insert({
                user_id: user.id,
                article_id: data.id,
                interaction_type: 'view',
                interaction_value: 1
              });
          }
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, user]);

  const handleLike = async () => {
    if (!user || !article) return;
    
    const newLiked = !liked;
    setLiked(newLiked);

    try {
      await supabase
        .from('article_interactions')
        .insert({
          user_id: user.id,
          article_id: article.id,
          interaction_type: 'like',
          interaction_value: newLiked ? 1 : -1
        });
    } catch (error) {
      console.error('Error tracking like:', error);
      setLiked(!newLiked); // Revert on error
    }
  };

  const handleBookmark = async () => {
    if (!user || !article) return;
    
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);

    try {
      await supabase
        .from('article_interactions')
        .insert({
          user_id: user.id,
          article_id: article.id,
          interaction_type: 'bookmark',
          interaction_value: newBookmarked ? 1 : -1
        });
    } catch (error) {
      console.error('Error tracking bookmark:', error);
      setBookmarked(!newBookmarked); // Revert on error
    }
  };

  const handleShare = async () => {
    if (!article) return;

    try {
      await navigator.share({
        title: article.title,
        text: article.description || article.ai_summary,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }

    if (user) {
      await supabase
        .from('article_interactions')
        .insert({
          user_id: user.id,
          article_id: article.id,
          interaction_type: 'share',
          interaction_value: 1
        });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-semibold mb-2">Article Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleLike}>
              <Heart className={`w-4 h-4 ${liked ? 'fill-current text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBookmark}>
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current text-blue-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Article */}
        <article className="space-y-6">
          {/* Category */}
          {article.categories && (
            <Badge variant="secondary" style={{ backgroundColor: `${article.categories.color}20`, color: article.categories.color }}>
              {article.categories.name}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {article.author && (
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(article.published_at || article.created_at)}</span>
            </div>
            {article.reading_time_minutes && (
              <span>{article.reading_time_minutes} min read</span>
            )}
            <span>{article.source_name}</span>
          </div>

          {/* Summary */}
          {article.ai_summary && (
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground italic">
                  {article.ai_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Image */}
          {article.url_to_image && (
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <img
                src={article.url_to_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {article.content?.split('\n').map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="mb-4 text-foreground leading-relaxed">
                  {paragraph}
                </p>
              )
            ))}
          </div>

          {/* Topics */}
          {article.topic_tags && article.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.topic_tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Quality Indicators */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Article Quality</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {article.content_quality_score && (
                  <div className="text-center">
                    <div className="font-medium">Content Quality</div>
                    <div className="text-muted-foreground">
                      {Math.round(article.content_quality_score * 100)}%
                    </div>
                  </div>
                )}
                {article.credibility_score && (
                  <div className="text-center">
                    <div className="font-medium">Credibility</div>
                    <div className="text-muted-foreground">
                      {Math.round(article.credibility_score * 100)}%
                    </div>
                  </div>
                )}
                {article.bias_score && (
                  <div className="text-center">
                    <div className="font-medium">Bias Level</div>
                    <div className="text-muted-foreground">
                      {Math.round((1 - article.bias_score) * 100)}% neutral
                    </div>
                  </div>
                )}
                {article.view_count && (
                  <div className="text-center">
                    <div className="font-medium">Views</div>
                    <div className="text-muted-foreground">
                      {article.view_count.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* External Link */}
          {article.url && article.url.startsWith('http') && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" asChild>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original Article
                </a>
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}