import { supabase } from '@/integrations/supabase/client'

interface RefreshServiceOptions {
  retryAttempts?: number
  retryDelay?: number
  onProgress?: (message: string) => void
  onError?: (error: Error) => void
}

class RefreshService {
  private isRefreshing = false
  private lastRefreshTime: Date | null = null
  private refreshQueue: (() => Promise<void>)[] = []

  constructor(private options: RefreshServiceOptions = {}) {
    this.options = {
      retryAttempts: 3,
      retryDelay: 2000,
      ...options
    }
  }

  // Check if the service is ready after project restart
  async checkServiceHealth(): Promise<boolean> {
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('articles')
        .select('id')
        .limit(1)

      if (error) {
        console.error('Service health check failed:', error)
        return false
      }

      console.log('✅ Service health check passed')
      return true
    } catch (error) {
      console.error('Service health check error:', error)
      return false
    }
  }

  // Initialize service after restart with proper error handling
  async initializeService(): Promise<void> {
    this.options.onProgress?.('Initializing service...')
    
    // Wait for service to be ready
    for (let attempt = 1; attempt <= (this.options.retryAttempts || 3); attempt++) {
      try {
        const isHealthy = await this.checkServiceHealth()
        
        if (isHealthy) {
          this.options.onProgress?.('Service initialized successfully')
          return
        }

        if (attempt < (this.options.retryAttempts || 3)) {
          this.options.onProgress?.(`Service not ready, retrying... (${attempt}/${this.options.retryAttempts})`)
          await this.delay(this.options.retryDelay || 2000)
        }
      } catch (error) {
        console.error(`Service initialization attempt ${attempt} failed:`, error)
        
        if (attempt === (this.options.retryAttempts || 3)) {
          const initError = new Error(`Service initialization failed after ${this.options.retryAttempts} attempts`)
          this.options.onError?.(initError)
          throw initError
        }

        await this.delay(this.options.retryDelay || 2000)
      }
    }
  }

  // Safe refresh with queue management
  async safeRefresh(refreshFunction: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.refreshQueue.push(async () => {
        try {
          await refreshFunction()
          resolve()
        } catch (error) {
          reject(error)
        }
      })

      this.processRefreshQueue()
    })
  }

  // Process queued refresh requests
  private async processRefreshQueue(): Promise<void> {
    if (this.isRefreshing || this.refreshQueue.length === 0) {
      return
    }

    this.isRefreshing = true

    try {
      while (this.refreshQueue.length > 0) {
        const refreshTask = this.refreshQueue.shift()
        if (refreshTask) {
          await refreshTask()
        }
      }
    } catch (error) {
      console.error('Error processing refresh queue:', error)
      this.options.onError?.(error as Error)
    } finally {
      this.isRefreshing = false
      this.lastRefreshTime = new Date()
    }
  }

  // Get time since last refresh
  getTimeSinceLastRefresh(): number | null {
    if (!this.lastRefreshTime) return null
    return Date.now() - this.lastRefreshTime.getTime()
  }

  // Check if refresh is needed based on time
  isRefreshNeeded(intervalMs: number = 300000): boolean {
    const timeSince = this.getTimeSinceLastRefresh()
    return timeSince === null || timeSince > intervalMs
  }

  // Force restart the auto-refresh mechanism with dynamic recovery
  async restartAutoRefresh(): Promise<void> {
    try {
      this.options.onProgress?.('Restarting auto-refresh system...')
      
      // Prefer enhanced-news-aggregator for real, fresh sources
      const { data: enhancedAggData, error: enhancedAggError } = await supabase.functions.invoke('enhanced-news-aggregator', {
        body: { category: 'general', limit: 150, forceRefresh: true }
      })

      if (enhancedAggError) {
        console.warn('Enhanced aggregator failed, trying reliable-news-fetcher:', enhancedAggError)
        
        const { data: reliableData, error: reliableError } = await supabase.functions.invoke('reliable-news-fetcher')
        
        if (reliableError) {
          console.warn('Reliable fetcher failed, trying enhanced-data-sync:', reliableError)
          
          // Fallback to enhanced data sync
          const { data: enhancedData, error: enhancedError } = await supabase.functions.invoke('enhanced-data-sync', {
            body: { 
              action: 'sync',
              force_fresh: true,
              cleanup_old: true
            }
          })

          if (enhancedError) {
            console.warn('Enhanced sync failed, trying auto-refresh:', enhancedError)
            
            // Last resort: auto-refresh
            const { data, error } = await supabase.functions.invoke('auto-news-refresh', {
              body: { force_restart: true }
            })

            if (error) {
              throw new Error(`All refresh methods failed: ${error.message}`)
            }
            
            this.options.onProgress?.('Auto-refresh system restarted successfully')
            console.log('✅ Auto-refresh system restarted:', data)
          } else {
            this.options.onProgress?.('Enhanced data sync completed successfully')
            console.log('✅ Enhanced data sync completed:', enhancedData)
          }
        } else {
          this.options.onProgress?.('Reliable news fetcher completed successfully')
          console.log('✅ Reliable news fetcher completed:', reliableData)
        }
      } else {
        this.options.onProgress?.('Enhanced aggregator completed successfully')
        console.log('✅ Enhanced aggregator completed:', enhancedAggData)
      }
    } catch (error) {
      console.error('Failed to restart auto-refresh:', error)
      this.options.onError?.(error as Error)
      throw error
    }
  }

  // Dynamic system health check and auto-recovery
  async performHealthCheckAndRecover(): Promise<void> {
    try {
      this.options.onProgress?.('Performing system health check...')
      
      const isHealthy = await this.checkServiceHealth()
      
      if (!isHealthy) {
        this.options.onProgress?.('System unhealthy, initiating recovery...')
        await this.restartAutoRefresh()
      }
      
      // Check data freshness and refresh if needed
      const { data: freshCheck } = await supabase
        .from('articles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      const latestArticle = freshCheck?.created_at
      const hoursOld = latestArticle ? 
        (Date.now() - new Date(latestArticle).getTime()) / (1000 * 60 * 60) : 
        24
      
      if (hoursOld > 2) {
        this.options.onProgress?.('Data is stale, fetching via enhanced-news-aggregator...')
        await supabase.functions.invoke('enhanced-news-aggregator', {
          body: { category: 'general', limit: 150, forceRefresh: true }
        })
      }
      
      this.options.onProgress?.('System health check completed')
    } catch (error) {
      console.error('Health check failed:', error)
      this.options.onError?.(error as Error)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Clean up resources
  cleanup(): void {
    this.refreshQueue = []
    this.isRefreshing = false
    this.lastRefreshTime = null
  }
}

// Singleton instance
export const refreshService = new RefreshService({
  retryAttempts: 3,
  retryDelay: 2000,
  onProgress: (message) => console.log('🔄', message),
  onError: (error) => console.error('❌ RefreshService error:', error)
})

export default RefreshService