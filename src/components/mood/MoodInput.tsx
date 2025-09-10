import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Heart, Brain, Zap, Clock, Lightbulb, Save } from 'lucide-react'

interface MoodInputProps {
  onMoodSubmit: (moodData: MoodData) => void
  loading?: boolean
  showPresets?: boolean
  savedPresets?: MoodPreset[]
  onSavePreset?: (name: string, moodData: MoodData) => void
}

export interface MoodData {
  emoji: string
  text: string
  intensity: number
  contextTags: string[]
}

export interface MoodPreset {
  name: string
  profile: any
  created_at: string
}

const MOOD_EMOJIS = ['😃', '🙂', '😐', '😟', '😭', '😴', '🤔', '😤', '🥳', '😌']
const CONTEXT_TAGS = [
  'light reads', 'deep analysis', 'inspirational', 'funny', 'short', 
  'breaking news', 'educational', 'trending', 'quick updates', 'research'
]

export default function MoodInput({ 
  onMoodSubmit, 
  loading = false, 
  showPresets = true,
  savedPresets = [],
  onSavePreset 
}: MoodInputProps) {
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [moodText, setMoodText] = useState('')
  const [intensity, setIntensity] = useState([3])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  const handleSubmit = () => {
    if (!selectedEmoji && !moodText.trim()) return

    const moodData: MoodData = {
      emoji: selectedEmoji,
      text: moodText.trim(),
      intensity: intensity[0],
      contextTags: selectedTags
    }

    onMoodSubmit(moodData)
  }

  const handlePresetClick = (preset: MoodPreset) => {
    // Convert preset back to MoodData format for UI
    const profile = preset.profile
    setSelectedEmoji(getEmojiFromProfile(profile))
    setMoodText(`Using "${preset.name}" preset`)
    setIntensity([Math.round(profile.energy_level * 5)])
    setSelectedTags(getTagsFromProfile(profile))
  }

  const getEmojiFromProfile = (profile: any) => {
    const energy = profile.energy_level || 0.5
    const positivity = profile.positivity_pref || 0.5
    
    if (energy > 0.8 && positivity > 0.7) return '😃'
    if (energy > 0.6 && positivity > 0.6) return '🙂'  
    if (energy < 0.3) return '😴'
    if (positivity < 0.3) return '😟'
    return '😐'
  }

  const getTagsFromProfile = (profile: any) => {
    const tags: string[] = []
    if (profile.want_depth > 0.7) tags.push('deep analysis')
    if (profile.want_depth < 0.3) tags.push('light reads', 'short')
    if (profile.length_tolerance < 0.3) tags.push('quick updates')
    if (profile.positivity_pref > 0.8) tags.push('inspirational')
    if (profile.curiosity_level > 0.8) tags.push('educational')
    return tags.slice(0, 3)
  }

  const handleSavePreset = () => {
    if (!presetName.trim() || !onSavePreset) return

    const moodData: MoodData = {
      emoji: selectedEmoji,
      text: moodText.trim(),
      intensity: intensity[0],
      contextTags: selectedTags
    }

    onSavePreset(presetName.trim(), moodData)
    setPresetName('')
    setShowSavePreset(false)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          How are you feeling?
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mood Presets */}
        {showPresets && savedPresets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Your Mood Presets
            </h4>
            <div className="flex flex-wrap gap-2">
              {savedPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="hover:bg-primary/10"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Quick mood</h4>
          <div className="grid grid-cols-5 gap-2">
            {MOOD_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant={selectedEmoji === emoji ? "default" : "outline"}
                size="lg"
                onClick={() => setSelectedEmoji(emoji)}
                className="text-2xl h-12"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Intensity Slider */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Intensity: {intensity[0]}/5
          </h4>
          <Slider
            value={intensity}
            onValueChange={setIntensity}
            max={5}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Text Input */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Describe your mood (optional)
          </h4>
          <Input
            placeholder="How are you feeling right now? (one sentence)"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Context Tags */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            What kind of content do you want?
          </h4>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Save as Preset */}
        {onSavePreset && (
          <div className="space-y-3">
            {!showSavePreset ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavePreset(true)}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save as preset
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Preset name (e.g., 'Morning Focus')"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSavePreset(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={(!selectedEmoji && !moodText.trim()) || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing your mood...
            </div>
          ) : (
            'Get personalized news'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}