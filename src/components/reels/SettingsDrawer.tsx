import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Settings,
  BarChart3,
  Filter,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Target,
  Shuffle,
  X,
  Plus,
  Trash2,
  Info
} from 'lucide-react'

export interface FeedSettings {
  balancedMode: boolean
  exploreRatio: number
  preferredTopics: string[]
  mutedTopics: string[]
  mutedSources: string[]
  qualityThreshold: number
  credibilityThreshold: number
  biasThreshold: number
  autoRefresh: boolean
  refreshInterval: number
  showNSFW: boolean
  language: string
}

interface ReelSettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Partial<FeedSettings>
  onSettingsChange: (settings: Partial<FeedSettings>) => void
}

const DEFAULT_SETTINGS: FeedSettings = {
  balancedMode: true,
  exploreRatio: 0.25,
  preferredTopics: [],
  mutedTopics: [],
  mutedSources: [],
  qualityThreshold: 0.4,
  credibilityThreshold: 0.3,
  biasThreshold: 0.8,
  autoRefresh: true,
  refreshInterval: 300, // 5 minutes
  showNSFW: false,
  language: 'en'
}

const POPULAR_TOPICS = [
  'Technology', 'Politics', 'Sports', 'Entertainment', 'Business',
  'Health', 'Science', 'World News', 'Climate', 'Education',
  'Finance', 'Art', 'Travel', 'Food', 'Gaming'
]

const QUALITY_DESCRIPTIONS = {
  quality: 'Filters out low-quality content like clickbait and spam',
  credibility: 'Shows articles from more trustworthy sources',
  bias: 'Controls political and ideological bias in articles'
}

export const ReelSettingsDrawer = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}: ReelSettingsDrawerProps) => {
  const [newTopic, setNewTopic] = useState('')
  const [newSource, setNewSource] = useState('')
  
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings }

  const handleSettingChange = <K extends keyof FeedSettings>(
    key: K,
    value: FeedSettings[K]
  ) => {
    onSettingsChange({ [key]: value })
  }

  const addPreferredTopic = (topic: string) => {
    if (topic && !currentSettings.preferredTopics.includes(topic)) {
      handleSettingChange('preferredTopics', [...currentSettings.preferredTopics, topic])
      setNewTopic('')
    }
  }

  const removePreferredTopic = (topic: string) => {
    handleSettingChange(
      'preferredTopics',
      currentSettings.preferredTopics.filter(t => t !== topic)
    )
  }

  const addMutedTopic = (topic: string) => {
    if (topic && !currentSettings.mutedTopics.includes(topic)) {
      handleSettingChange('mutedTopics', [...currentSettings.mutedTopics, topic])
    }
  }

  const removeMutedTopic = (topic: string) => {
    handleSettingChange(
      'mutedTopics',
      currentSettings.mutedTopics.filter(t => t !== topic)
    )
  }

  const addMutedSource = (source: string) => {
    if (source && !currentSettings.mutedSources.includes(source)) {
      handleSettingChange('mutedSources', [...currentSettings.mutedSources, source])
      setNewSource('')
    }
  }

  const removeMutedSource = (source: string) => {
    handleSettingChange(
      'mutedSources',
      currentSettings.mutedSources.filter(s => s !== source)
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Feed Settings</span>
          </SheetTitle>
          <SheetDescription>
            Customize your news feed to match your preferences and interests.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full pb-6 pr-4">
          <div className="space-y-6 mt-6">
            {/* Content Discovery */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Content Discovery</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Balanced Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Balanced Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Show diverse perspectives on political topics
                    </p>
                  </div>
                  <Switch
                    checked={currentSettings.balancedMode}
                    onCheckedChange={(checked) => handleSettingChange('balancedMode', checked)}
                  />
                </div>

                {/* Explore Ratio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exploration</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentSettings.exploreRatio * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentSettings.exploreRatio]}
                    onValueChange={([value]) => handleSettingChange('exploreRatio', value)}
                    max={0.7}
                    min={0.05}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values show more diverse content outside your interests
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content Quality */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Content Quality</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quality Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Quality Filter</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentSettings.qualityThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentSettings.qualityThreshold]}
                    onValueChange={([value]) => handleSettingChange('qualityThreshold', value)}
                    max={0.9}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {QUALITY_DESCRIPTIONS.quality}
                  </p>
                </div>

                {/* Credibility Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Source Credibility</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentSettings.credibilityThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentSettings.credibilityThreshold]}
                    onValueChange={([value]) => handleSettingChange('credibilityThreshold', value)}
                    max={0.9}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {QUALITY_DESCRIPTIONS.credibility}
                  </p>
                </div>

                {/* Bias Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Bias Control</Label>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentSettings.biasThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentSettings.biasThreshold]}
                    onValueChange={([value]) => handleSettingChange('biasThreshold', value)}
                    max={1.0}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {QUALITY_DESCRIPTIONS.bias}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preferred Topics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Preferred Topics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add topic..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addPreferredTopic(newTopic)
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => addPreferredTopic(newTopic)}
                    disabled={!newTopic}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Popular topics */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Popular topics:</Label>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_TOPICS.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => addPreferredTopic(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Current preferred topics */}
                {currentSettings.preferredTopics.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Your interests:</Label>
                    <div className="flex flex-wrap gap-1">
                      {currentSettings.preferredTopics.map((topic) => (
                        <Badge
                          key={topic}
                          className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                          onClick={() => removePreferredTopic(topic)}
                        >
                          {topic}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Muted Topics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <VolumeX className="w-4 h-4" />
                  <span>Muted Topics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentSettings.mutedTopics.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Hidden topics:</Label>
                    <div className="flex flex-wrap gap-1">
                      {currentSettings.mutedTopics.map((topic) => (
                        <Badge
                          key={topic}
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => removeMutedTopic(topic)}
                        >
                          {topic}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Click on topic badges in articles to mute them, or click here to unmute.
                </p>
              </CardContent>
            </Card>

            {/* Muted Sources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <EyeOff className="w-4 h-4" />
                  <span>Muted Sources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add source to mute..."
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addMutedSource(newSource)
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => addMutedSource(newSource)}
                    disabled={!newSource}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {currentSettings.mutedSources.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Hidden sources:</Label>
                    <div className="flex flex-wrap gap-1">
                      {currentSettings.mutedSources.map((source) => (
                        <Badge
                          key={source}
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => removeMutedSource(source)}
                        >
                          {source}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto Refresh */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Shuffle className="w-4 h-4" />
                  <span>Auto Refresh</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Enable Auto Refresh</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically load new articles
                    </p>
                  </div>
                  <Switch
                    checked={currentSettings.autoRefresh}
                    onCheckedChange={(checked) => handleSettingChange('autoRefresh', checked)}
                  />
                </div>

                {currentSettings.autoRefresh && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Refresh Interval</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(currentSettings.refreshInterval / 60)} minutes
                      </span>
                    </div>
                    <Slider
                      value={[currentSettings.refreshInterval]}
                      onValueChange={([value]) => handleSettingChange('refreshInterval', value)}
                      max={1800} // 30 minutes
                      min={60}   // 1 minute
                      step={60}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset Settings */}
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}