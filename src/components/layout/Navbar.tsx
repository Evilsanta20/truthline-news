import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Newspaper, Search, User, Settings, LogOut, PenTool, Shield, BookOpen } from 'lucide-react'

export const Navbar = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="border-b-4 border-[hsl(var(--newspaper-divider))] bg-background sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo - Newspaper Style */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="flex flex-col items-center">
              <Newspaper className="w-6 h-6 text-foreground" />
              <div className="h-px w-6 bg-[hsl(var(--newspaper-divider))] mt-0.5"></div>
            </div>
            <div>
              <span className="font-headline font-black text-2xl tracking-tight text-foreground">THE TRUTHLINE</span>
              <div className="text-[0.6rem] newspaper-byline tracking-widest -mt-1">DIGITAL EDITION</div>
            </div>
          </Link>

          {/* Navigation Links - Newspaper Style */}
          {user && (
            <div className="hidden md:flex items-center space-x-6 newspaper-byline">
              <Link 
                to="/" 
                className={`text-xs tracking-wider transition-colors hover:text-foreground hover:underline decoration-2 underline-offset-4 ${
                  isActive('/') ? 'text-foreground font-bold underline' : 'text-[hsl(var(--newspaper-byline))]'
                }`}
              >
                HOME
              </Link>
              <span className="text-[hsl(var(--newspaper-border))]">|</span>
              <span className="text-xs tracking-wider">SECTIONS</span>
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted rounded-none">
                  <Search className="w-4 h-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-none border border-[hsl(var(--newspaper-border))] hover:bg-muted">
                      <Avatar className="h-8 w-8 rounded-none">
                        <AvatarFallback className="bg-foreground text-background rounded-none font-headline font-bold">
                          {user.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-none border-2 border-[hsl(var(--newspaper-border))]" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2 border-b-2 border-[hsl(var(--newspaper-border))]">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-headline font-semibold text-sm">{user.email}</p>
                        <p className="w-[200px] truncate text-xs newspaper-byline">
                          SUBSCRIBER
                        </p>
                      </div>
                    </div>
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer newspaper-byline hover:bg-muted">
                      <LogOut className="mr-2 h-3 w-3" />
                      SIGN OUT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button className="btn-news rounded-none">
                  <User className="w-3 h-3 mr-1" />
                  SUBSCRIBE
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}