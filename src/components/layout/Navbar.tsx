import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Newspaper, Search, User, Settings, LogOut, PenTool, Shield, BookOpen } from 'lucide-react'

export const Navbar = () => {
  const { user, profile, signOut, hasRole } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground'
      case 'editor': return 'bg-primary text-primary-foreground'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3 h-3" />
      case 'editor': return <PenTool className="w-3 h-3" />
      default: return <BookOpen className="w-3 h-3" />
    }
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Newspaper className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">NewsDigest</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/bookmarks" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/bookmarks') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Bookmarks
              </Link>
              {hasRole('editor') && (
                <Link 
                  to="/editor" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/editor') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Editor
                </Link>
              )}
              {hasRole('admin') && (
                <Link 
                  to="/admin" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Search className="w-5 h-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{profile?.full_name || user.email}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <Badge 
                          className={`w-fit text-xs ${getRoleBadgeColor(profile?.role || 'viewer')}`}
                        >
                          <span className="flex items-center gap-1">
                            {getRoleIcon(profile?.role || 'viewer')}
                            {profile?.role || 'viewer'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button className="btn-news">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}