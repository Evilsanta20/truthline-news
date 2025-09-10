import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Sparkles, TrendingUp, Settings } from 'lucide-react'
import MoodInput from '@/components/mood/MoodInput'
import MoodBasedFeed from '@/components/mood/MoodBasedFeed'
import { useMoodPersonalization } from '@/hooks/useMoodPersonalization'
import type { MoodData } from '@/components/mood/MoodInput'
import { toast } from 'sonner'

interface MoodPageProps {
  userId: string
}

export function MoodPage({ userId }: MoodPageProps) {
  const [showMoodInput, setShowMoodInput] = useState(true)
  const {
    currentMood,
    moodPresets,
    recommendations,
    moodProfile,
    loading,
    processMood,
    saveMoodPreset,
    refreshRecommendations
  } = useMoodPersonalization(userId)

  const handleMoodSubmit = async (moodData: MoodData) => {
    const result = await processMood(moodData)
    
    if (result.success) {
      setShowMoodInput(false)
      toast.success('Your mood has been processed! Here are your personalized recommendations.')
    } else {
      toast.error(`Failed to process mood: ${result.error}`)
    }
  }

  const handleSavePreset = async (name: string, moodData: MoodData) => {
    const result = await saveMoodPreset(name, moodData)
    
    if (result.success) {
      toast.success(`Mood preset "${name}" saved successfully!`)
    } else {
      toast.error(`Failed to save preset: ${result.error}`)
    }
  }

  const handleUpdateMood = () => {
    setShowMoodInput(true)
  }

  // Show mood input if no current mood or user wants to update
  if (showMoodInput || !currentMood) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Mood-Based News</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us how you're feeling and get personalized news recommendations that match your current mood and preferences.
          </p>
        </div>

        {/* Mood Input */}
        <MoodInput
          onMoodSubmit={handleMoodSubmit}
          loading={loading}
          showPresets={true}
          savedPresets={moodPresets}
          onSavePreset={handleSavePreset}
        />

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader className="text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">AI-Powered Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Our AI analyzes your mood and preferences to find articles that perfectly match how you're feeling right now.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Adaptive Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Get content organized into sections like "For You", "Brief", "Deep Dive", and "Uplifting" based on your mood.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Mood Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Save your favorite mood combinations as presets for quick access to your preferred news experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show mood-based feed
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with mood update option */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Your Mood-Based Feed</h1>
        </div>
        <Button
          onClick={handleUpdateMood}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Update Mood
        </Button>
      </div>

      {/* Mood-Based Feed */}
      <MoodBasedFeed
        userId={userId}
        moodProfile={moodProfile}
        className="w-full"
      />
    </div>
  )
}