import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Shield, Zap, Filter, Users, Bookmark, TrendingUp, ChevronRight, Check, Database, Server, Brain, Lock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b-4 border-[hsl(var(--newspaper-divider))] py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <Badge className="mb-4 px-6 py-2 text-lg font-headline">TRUTHLINE NEWS</Badge>
          </div>
          <h1 className="font-headline font-black text-6xl md:text-7xl mb-6 text-foreground leading-tight">
            YOUR PERSONAL, CLUTTER-FREE,<br />AUTHENTIC NEWS FEED
          </h1>
          <p className="font-body text-xl md:text-2xl text-foreground/80 mb-10 max-w-3xl mx-auto leading-relaxed">
            Cut through the noise. Get verified, personalized news powered by AI authenticity filters and multi-source cross-checking.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/auth">
              <Button className="btn-news text-lg px-10 py-7 rounded-none">
                Explore Demo <ChevronRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Truthline - Problem & Personas */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline font-bold text-4xl md:text-5xl mb-4 text-foreground uppercase">
              Why Truthline?
            </h2>
            <div className="h-1 w-24 bg-[hsl(var(--newspaper-divider))] mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="border-4 border-[hsl(var(--newspaper-border))] p-8">
              <h3 className="newspaper-headline text-2xl mb-4">THE PROBLEM</h3>
              <ul className="space-y-3 newspaper-body">
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">×</span>
                  <span>News overload and information fatigue</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">×</span>
                  <span>Misleading headlines and sensationalism</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">×</span>
                  <span>Noisy, unfiltered social media feeds</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive font-bold">×</span>
                  <span>Lack of source credibility transparency</span>
                </li>
              </ul>
            </div>

            <div className="border-4 border-[hsl(var(--newspaper-border))] p-8 bg-background">
              <h3 className="newspaper-headline text-2xl mb-4">WHO BENEFITS</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold newspaper-byline mb-1">STUDENTS</p>
                    <p className="newspaper-body text-sm">Get current affairs summaries and authentic sources for research</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold newspaper-byline mb-1">PROFESSIONALS</p>
                    <p className="newspaper-body text-sm">5-minute digest of industry news without clickbait</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold newspaper-byline mb-1">RESEARCHERS</p>
                    <p className="newspaper-body text-sm">Access filtered, authentic content with credibility scores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Truthline Ensures Authenticity */}
      <section className="py-16 px-4 border-b-4 border-[hsl(var(--newspaper-divider))]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline font-bold text-4xl md:text-5xl mb-4 text-foreground uppercase">
              How Truthline Ensures Authenticity
            </h2>
            <div className="h-1 w-24 bg-[hsl(var(--newspaper-divider))] mx-auto mb-6"></div>
            <p className="newspaper-body text-lg max-w-3xl mx-auto">
              Our multi-layer approach combines AI analysis, source verification, and cross-checking to deliver only credible news.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-[hsl(var(--newspaper-border))] flex items-center justify-center">
                <span className="newspaper-headline text-3xl">1</span>
              </div>
              <h3 className="newspaper-headline text-xl mb-3">SOURCE CREDIBILITY</h3>
              <p className="newspaper-body text-sm">
                Every article is scored based on source reputation, domain authority, and historical accuracy
              </p>
            </div>

            <div className="border-2 border-[hsl(var(--newspaper-border))] p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-[hsl(var(--newspaper-border))] flex items-center justify-center">
                <span className="newspaper-headline text-3xl">2</span>
              </div>
              <h3 className="newspaper-headline text-xl mb-3">MULTI-SOURCE CROSS-CHECK</h3>
              <p className="newspaper-body text-sm">
                AI compares similar stories across multiple outlets to identify consensus and flag outliers
              </p>
            </div>

            <div className="border-2 border-[hsl(var(--newspaper-border))] p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-[hsl(var(--newspaper-border))] flex items-center justify-center">
                <span className="newspaper-headline text-3xl">3</span>
              </div>
              <h3 className="newspaper-headline text-xl mb-3">NOISE FILTERING</h3>
              <p className="newspaper-body text-sm">
                Advanced NLP filters sensationalism, bias, and clickbait while maintaining factual clarity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline font-bold text-4xl md:text-5xl mb-4 text-foreground uppercase">
              Features
            </h2>
            <div className="h-1 w-24 bg-[hsl(var(--newspaper-divider))] mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Core Features */}
            <div className="border-4 border-[hsl(var(--newspaper-border))] p-6">
              <h3 className="newspaper-headline text-xl mb-4 pb-2 border-b-2 border-[hsl(var(--newspaper-border))]">
                CORE FEATURES
              </h3>
              <ul className="space-y-3 newspaper-body text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>AI-powered personalized feed</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Automatic article summarization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Category-based browsing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Real-time news updates</span>
                </li>
              </ul>
            </div>

            {/* User Features */}
            <div className="border-4 border-[hsl(var(--newspaper-border))] p-6">
              <h3 className="newspaper-headline text-xl mb-4 pb-2 border-b-2 border-[hsl(var(--newspaper-border))]">
                USER FEATURES
              </h3>
              <ul className="space-y-3 newspaper-body text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Save bookmarks for later</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Reading preferences tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Source blocking controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Multimedia news reels</span>
                </li>
              </ul>
            </div>

            {/* AI Features */}
            <div className="border-4 border-[hsl(var(--newspaper-border))] p-6 bg-background">
              <h3 className="newspaper-headline text-xl mb-4 pb-2 border-b-2 border-[hsl(var(--newspaper-border))]">
                AI FEATURES
              </h3>
              <ul className="space-y-3 newspaper-body text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Authenticity scoring system</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Bias detection algorithms</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>NLP-powered summaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Sentiment analysis</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Transparency */}
      <section className="py-16 px-4 border-b-4 border-[hsl(var(--newspaper-divider))]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline font-bold text-4xl md:text-5xl mb-4 text-foreground uppercase">
              Powered by Technology
            </h2>
            <div className="h-1 w-24 bg-[hsl(var(--newspaper-divider))] mx-auto mb-6"></div>
            <p className="newspaper-body text-lg max-w-3xl mx-auto">
              Built on modern, scalable infrastructure with privacy-first principles
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-8">
              <h3 className="newspaper-headline text-xl mb-4">TECH STACK</h3>
              <div className="grid grid-cols-2 gap-4 newspaper-body text-sm">
                <div>
                  <p className="newspaper-byline mb-2">FRONTEND</p>
                  <ul className="space-y-1">
                    <li>• React + TypeScript</li>
                    <li>• Vite Build System</li>
                    <li>• Tailwind CSS</li>
                  </ul>
                </div>
                <div>
                  <p className="newspaper-byline mb-2">BACKEND</p>
                  <ul className="space-y-1">
                    <li>• Supabase</li>
                    <li>• Edge Functions</li>
                    <li>• PostgreSQL</li>
                  </ul>
                </div>
                <div>
                  <p className="newspaper-byline mb-2">AI/ML</p>
                  <ul className="space-y-1">
                    <li>• NLP Processing</li>
                    <li>• Sentiment Analysis</li>
                    <li>• Content Scoring</li>
                  </ul>
                </div>
                <div>
                  <p className="newspaper-byline mb-2">APIs</p>
                  <ul className="space-y-1">
                    <li>• News Aggregation</li>
                    <li>• RSS Feeds</li>
                    <li>• Multi-Source</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-2 border-[hsl(var(--newspaper-border))] p-8 bg-muted/50">
              <h3 className="newspaper-headline text-xl mb-4">DATA FLOW</h3>
              <div className="space-y-4 newspaper-body text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[hsl(var(--newspaper-border))] flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="flex-1">User preferences & reading patterns</span>
                </div>
                <div className="border-l-2 border-[hsl(var(--newspaper-border))] h-6 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[hsl(var(--newspaper-border))] flex items-center justify-center flex-shrink-0">
                    <Filter className="w-4 h-4" />
                  </div>
                  <span className="flex-1">AI filtering & authenticity checks</span>
                </div>
                <div className="border-l-2 border-[hsl(var(--newspaper-border))] h-6 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[hsl(var(--newspaper-border))] flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Secure database storage</span>
                </div>
                <div className="border-l-2 border-[hsl(var(--newspaper-border))] h-6 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[hsl(var(--newspaper-border))] flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Personalized feed delivery</span>
                </div>
              </div>
              <div className="mt-6 p-4 border border-[hsl(var(--newspaper-border))] bg-background">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs newspaper-body">
                    <strong>Privacy-Safe:</strong> User data is encrypted and never sold. Reading patterns are used only for personalization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-headline font-bold text-4xl md:text-5xl mb-4 text-foreground uppercase">
              What's Next?
            </h2>
            <div className="h-1 w-24 bg-[hsl(var(--newspaper-divider))] mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-6 text-center">
              <Brain className="w-8 h-8 mx-auto mb-3" />
              <h3 className="newspaper-headline text-sm mb-2">ENHANCED ML</h3>
              <p className="newspaper-body text-xs">Advanced truth detection algorithms</p>
            </div>
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-6 text-center">
              <Server className="w-8 h-8 mx-auto mb-3" />
              <h3 className="newspaper-headline text-sm mb-2">MOBILE APP</h3>
              <p className="newspaper-body text-xs">Native iOS & Android applications</p>
            </div>
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-6 text-center">
              <Shield className="w-8 h-8 mx-auto mb-3" />
              <h3 className="newspaper-headline text-sm mb-2">SOURCE METRICS</h3>
              <p className="newspaper-body text-xs">Detailed quality scoring dashboard</p>
            </div>
            <div className="border-2 border-[hsl(var(--newspaper-border))] p-6 text-center">
              <Filter className="w-8 h-8 mx-auto mb-3" />
              <h3 className="newspaper-headline text-sm mb-2">USER CONTROLS</h3>
              <p className="newspaper-body text-xs">Granular filtering preferences</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-[hsl(var(--newspaper-divider))] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="border-r border-[hsl(var(--newspaper-border))] pr-8">
              <h3 className="newspaper-headline text-lg mb-3">DISCLAIMER</h3>
              <p className="newspaper-body text-xs leading-relaxed">
                Truthline aggregates news from third-party APIs and sources. While we employ AI-powered authenticity checks, 
                articles are not manually fact-checked. Users are encouraged to verify critical information independently.
              </p>
            </div>
            <div className="border-r border-[hsl(var(--newspaper-border))] pr-8">
              <h3 className="newspaper-headline text-lg mb-3">PRIVACY</h3>
              <p className="newspaper-body text-xs leading-relaxed">
                We respect your privacy. Your data is encrypted and secure. We never sell or share personal information 
                with third parties. Reading patterns are used solely for personalization within the platform.
              </p>
            </div>
            <div>
              <h3 className="newspaper-headline text-lg mb-3">CREDITS</h3>
              <p className="newspaper-body text-xs leading-relaxed mb-4">
                Built by <strong>Prajwal Shetty S</strong> as an academic project demonstrating modern full-stack 
                development with AI/ML integration for news authenticity.
              </p>
              <p className="newspaper-byline text-xs">
                © 2025 Truthline News. All rights reserved.
              </p>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-[hsl(var(--newspaper-border))]">
            <Link to="/auth">
              <Button variant="outline" className="rounded-none border-2 border-[hsl(var(--newspaper-border))] newspaper-byline text-xs">
                GET STARTED →
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
