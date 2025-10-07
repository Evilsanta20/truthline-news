import { ReactNode } from 'react'

interface NewspaperSectionProps {
  title: string
  children: ReactNode
  className?: string
}

export const NewspaperSection = ({ title, children, className = '' }: NewspaperSectionProps) => {
  return (
    <div className={`mb-12 ${className}`}>
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 h-px bg-[hsl(var(--newspaper-divider))]"></div>
          <h2 className="font-headline font-bold text-3xl tracking-tight text-foreground uppercase">
            {title}
          </h2>
          <div className="flex-1 h-px bg-[hsl(var(--newspaper-divider))]"></div>
        </div>
        <div className="h-1 bg-[hsl(var(--newspaper-divider))]"></div>
      </div>
      
      {/* Section Content */}
      <div>{children}</div>
    </div>
  )
}
