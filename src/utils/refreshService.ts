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

  // Force restart the auto-refresh mechanism
  async restartAutoRefresh(): Promise<void> {
    try {
      this.options.onProgress?.('Restarting auto-refresh system...')
      
      const { data, error } = await supabase.functions.invoke('auto-news-refresh', {
        body: { force_restart: true }
      })

      if (error) {
        throw new Error(`Auto-refresh restart failed: ${error.message}`)
      }

      this.options.onProgress?.('Auto-refresh system restarted successfully')
      console.log('✅ Auto-refresh system restarted:', data)
    } catch (error) {
      console.error('Failed to restart auto-refresh:', error)
      this.options.onError?.(error as Error)
      throw error
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