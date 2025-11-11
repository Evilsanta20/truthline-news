import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Activity, Database, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FetchLog {
  id: string
  api_source: string
  category: string
  articles_fetched: number
  articles_stored: number
  api_status: 'success' | 'error' | 'no_data'
  error_message: string | null
  fetch_timestamp: string
  execution_time_ms: number
}

interface SystemStats {
  total_articles: number
  last_refresh: string
  sources_active: number
  avg_quality_score: number
}

export const NewsSystemDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<FetchLog[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)

  useEffect(() => {
    loadDashboardData()
    
    // Auto-reload every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get logs
      const logsResult = await supabase.functions.invoke('cybotic-news-system', {
        body: { action: 'get_logs' }
      })
      
      if (logsResult.data?.logs) {
        setLogs(logsResult.data.logs)
      }
      
      // Get system stats
      const { data: articles } = await supabase
        .from('articles')
        .select('created_at, content_quality_score, source_name')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (articles) {
        const uniqueSources = new Set(articles.map(a => a.source_name).filter(Boolean))
        const avgQuality = articles
          .filter(a => a.content_quality_score)
          .reduce((sum, a) => sum + (a.content_quality_score || 0), 0) / articles.length
        
        setStats({
          total_articles: articles.length,
          last_refresh: articles[0]?.created_at || '',
          sources_active: uniqueSources.size,
          avg_quality_score: avgQuality || 0
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const triggerRefresh = async () => {
    try {
      setRefreshing(true)
      toast.info('Starting news refresh...')
      
      const result = await supabase.functions.invoke('enhanced-news-aggregator', {
        body: {
          category: 'general',
          limit: 80,
          forceRefresh: true
        }
      })
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      const articlesProcessed = result.data?.total_articles || 0
      toast.success(`News refresh completed! ${articlesProcessed} articles processed.`)
      
      // Reload dashboard data
      await loadDashboardData()
    } catch (error: any) {
      console.error('Error triggering refresh:', error)
      toast.error(`Refresh failed: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const triggerAutoRefresh = async () => {
    try {
      toast.info('Starting auto-refresh system...')
      
      const result = await supabase.functions.invoke('auto-news-refresh', {
        body: {}
      })
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      toast.success('Auto-refresh completed successfully!')
      await loadDashboardData()
    } catch (error: any) {
      console.error('Error triggering auto-refresh:', error)
      toast.error(`Auto-refresh failed: ${error.message}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'no_data': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cybotic News System</h2>
          <p className="text-muted-foreground">
            Real-time news aggregation from multiple sources with automatic refresh
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={triggerAutoRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Test Auto-Refresh
          </Button>
          <Button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_articles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Last updated: {formatTimestamp(stats.last_refresh)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sources_active}</div>
              <p className="text-xs text-muted-foreground">
                NewsAPI, Reuters, India Today, Firecrawl
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avg_quality_score * 100).toFixed(1)}%</div>
              <Progress value={stats.avg_quality_score * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Refresh</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15 min</div>
              <p className="text-xs text-muted-foreground">
                Automatic refresh interval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Fetch Logs</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fetch Logs</CardTitle>
              <CardDescription>
                Latest API calls and their results from all news sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading logs...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(log.api_status)}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.api_source}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(log.fetch_timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {log.api_status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : log.api_status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm">
                            {log.articles_stored}/{log.articles_fetched}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.execution_time_ms}ms
                        </div>
                        {log.error_message && (
                          <div className="text-xs text-red-500 max-w-48 truncate">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details about the news aggregation system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">News Sources Priority</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. NewsAPI</span>
                      <Badge variant="secondary">Primary</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Reuters RSS</span>
                      <Badge variant="secondary">Secondary</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>3. India Today RSS</span>
                      <Badge variant="secondary">Secondary</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Firecrawl</span>
                      <Badge variant="outline">Fallback</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Categories Tracked</h4>
                  <div className="space-y-1 text-sm">
                    <Badge variant="outline">General</Badge>
                    <Badge variant="outline">Technology</Badge>
                    <Badge variant="outline">Business</Badge>
                    <Badge variant="outline">Health</Badge>
                    <Badge variant="outline">Sports</Badge>
                    <Badge variant="outline">Politics</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Duplicate detection by content hash and URL
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Automatic article archiving before updates
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quality scoring and credibility assessment
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    15-minute auto-refresh intervals
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Comprehensive logging and monitoring
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}