import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { 
  Settings, 
  Scale, 
  Zap, 
  Eye, 
  Sliders,
  Shield,
  Globe,
  Filter,
  X
} from 'lucide-react'

interface FeedSettingsDrawerProps {
  balancedMode: boolean
  onBalancedModeChange: (enabled: boolean) => void
  exploreRatio: number
  onExploreRatioChange: (ratio: number) => void
  autoRefresh: boolean
  onAutoRefreshChange: (enabled: boolean) => void
  refreshInterval: number
  onRefreshIntervalChange: (interval: number) => void
  mutedTopics: string[]
  onMutedTopicsChange: (topics: string[]) => void
  blockedSources: string[]
  onBlockedSourcesChange: (sources: string[]) => void
}

const COMMON_TOPICS = [
  'politics', 'technology', 'sports', 'entertainment', 'business', 
  'health', 'science', 'world', 'climate', 'economy', 'crypto',
  'ai', 'space', 'gaming', 'music', 'movies', 'celebrity'
]

const COMMON_SOURCES = [
  'CNN', 'BBC', 'Reuters', 'Associated Press', 'Fox News',
  'The Guardian', 'Wall Street Journal', 'New York Times',
  'Washington Post', 'NPR', 'Bloomberg', 'TechCrunch'
]

export default function FeedSettingsDrawer({
  balancedMode,
  onBalancedModeChange,
  exploreRatio,
  onExploreRatioChange,
  autoRefresh,
  onAutoRefreshChange,
  refreshInterval,
  onRefreshIntervalChange,
  mutedTopics,
  onMutedTopicsChange,
  blockedSources,
  onBlockedSourcesChange
}: FeedSettingsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMutedTopic = (topic: string) => {
    if (mutedTopics.includes(topic)) {
      onMutedTopicsChange(mutedTopics.filter(t => t !== topic))
    } else {
      onMutedTopicsChange([...mutedTopics, topic])
    }
  }

  const toggleBlockedSource = (source: string) => {
    if (blockedSources.includes(source)) {
      onBlockedSourcesChange(blockedSources.filter(s => s !== source))
    } else {
      onBlockedSourcesChange([...blockedSources, source])
    }
  }

  const getExploreDescription = (ratio: number) => {
    if (ratio <= 0.1) return 'Highly personalized - very little exploration'
    if (ratio <= 0.25) return 'Mostly personalized with some new content'
    if (ratio <= 0.5) return 'Balanced mix of personalized and new content'
    return 'Discovery focused - lots of new and diverse content'
  }

  const getRefreshDescription = (interval: number) => {
    if (interval <= 120) return 'Very frequent updates'
    if (interval <= 300) return 'Regular updates'
    if (interval <= 600) return 'Moderate refresh rate'
    return 'Infrequent updates - saves bandwidth'
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="hover-lift">
          <Settings className="w-4 h-4 mr-2" />
          Feed Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Feed Preferences
          </SheetTitle>
          <SheetDescription>
            Customize your news feed experience with advanced personalization controls
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Balanced Mode */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Scale className="w-4 h-4" />
                Political Balance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="balanced-mode">Enable Balanced Feed</Label>
                  <p className="text-xs text-muted-foreground">
                    Diversify political perspectives across left, center, and right viewpoints
                  </p>
                </div>
                <Switch
                  id="balanced-mode"
                  checked={balancedMode}
                  onCheckedChange={onBalancedModeChange}
                />
              </div>
              {balancedMode && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Articles will be mixed across political leanings for balanced perspective
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exploration Ratio */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4" />
                Content Discovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Exploration vs Personalization</Label>
                  <Badge variant="secondary">{Math.round(exploreRatio * 100)}% exploration</Badge>
                </div>
                <Slider
                  value={[exploreRatio]}
                  onValueChange={(value) => onExploreRatioChange(value[0])}
                  max={0.7}
                  min={0.05}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {getExploreDescription(exploreRatio)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto Refresh Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4" />
                Auto Refresh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-refresh">Enable Auto Refresh</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically fetch new articles in the background
                  </p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={onAutoRefreshChange}
                />
              </div>
              
              {autoRefresh && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Refresh Interval</Label>
                    <Badge variant="secondary">{Math.floor(refreshInterval / 60)}m {refreshInterval % 60}s</Badge>
                  </div>
                  <Slider
                    value={[refreshInterval]}
                    onValueChange={(value) => onRefreshIntervalChange(value[0])}
                    max={900} // 15 minutes
                    min={60}  // 1 minute
                    step={30}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {getRefreshDescription(refreshInterval)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Muted Topics */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4" />
                Content Filtering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Muted Topics</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Topics you don't want to see in your feed
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TOPICS.map((topic) => (
                    <Badge
                      key={topic}
                      variant={mutedTopics.includes(topic) ? "default" : "outline"}
                      className="cursor-pointer capitalize hover:scale-105 transition-transform"
                      onClick={() => toggleMutedTopic(topic)}
                    >
                      {mutedTopics.includes(topic) && <X className="w-3 h-3 mr-1" />}
                      {topic}
                    </Badge>
                  ))}
                </div>
                {mutedTopics.length > 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    {mutedTopics.length} topic{mutedTopics.length > 1 ? 's' : ''} muted
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Blocked Sources */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                Source Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Blocked Sources</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  News sources you prefer not to see
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SOURCES.map((source) => (
                    <Badge
                      key={source}
                      variant={blockedSources.includes(source) ? "destructive" : "outline"}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => toggleBlockedSource(source)}
                    >
                      {blockedSources.includes(source) && <X className="w-3 h-3 mr-1" />}
                      {source}
                    </Badge>
                  ))}
                </div>
                {blockedSources.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    {blockedSources.length} source{blockedSources.length > 1 ? 's' : ''} blocked
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reset Settings */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  onBalancedModeChange(true)
                  onExploreRatioChange(0.25)
                  onAutoRefreshChange(true)
                  onRefreshIntervalChange(300)
                  onMutedTopicsChange([])
                  onBlockedSourcesChange([])
                }}
              >
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}