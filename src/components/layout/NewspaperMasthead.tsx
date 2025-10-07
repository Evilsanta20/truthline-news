import { Calendar, MapPin, CloudRain, Sun, TrendingUp } from 'lucide-react'

export const NewspaperMasthead = () => {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  return (
    <div className="bg-background border-b-4 border-[hsl(var(--newspaper-divider))]">
      {/* Top Bar with Date and Weather */}
      <div className="border-b-2 border-[hsl(var(--newspaper-border))] bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-between items-center text-xs newspaper-byline">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>NEW YORK, USA</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Sun className="w-3 h-3" />
                <span>72°F</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>EDITION: DIGITAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          {/* Ornamental top border */}
          <div className="flex items-center justify-center mb-4">
            <div className="h-0.5 bg-[hsl(var(--newspaper-divider))] flex-1 max-w-xs"></div>
            <div className="mx-4 w-2 h-2 border border-[hsl(var(--newspaper-divider))] rotate-45"></div>
            <div className="h-0.5 bg-[hsl(var(--newspaper-divider))] flex-1 max-w-xs"></div>
          </div>
          
          {/* Newspaper Title */}
          <h1 className="font-headline font-black text-6xl md:text-8xl tracking-tight text-foreground mb-2">
            THE TRUTHLINE
          </h1>
          
          {/* Subtitle */}
          <p className="newspaper-byline text-xs tracking-widest mb-4">
            "ALL THE NEWS THAT'S FIT TO READ"
          </p>
          
          {/* Ornamental bottom border */}
          <div className="flex items-center justify-center">
            <div className="h-0.5 bg-[hsl(var(--newspaper-divider))] flex-1 max-w-xs"></div>
            <div className="mx-4 w-2 h-2 border border-[hsl(var(--newspaper-divider))] rotate-45"></div>
            <div className="h-0.5 bg-[hsl(var(--newspaper-divider))] flex-1 max-w-xs"></div>
          </div>
        </div>
      </div>

      {/* Bottom Bar with Volume/Edition Info */}
      <div className="border-t-2 border-[hsl(var(--newspaper-border))] bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="flex justify-between items-center text-xs newspaper-byline">
            <span>VOL. XCVIII ... No. 33,845</span>
            <span>FOUNDED 2024</span>
            <span>PRICE: FREE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
