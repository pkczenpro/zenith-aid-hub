import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Bell, Settings, User, Menu, Shield, LogOut, Users, Plus, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GlobalSearch } from "@/components/GlobalSearch";

const Header = () => {
  const { user, profile, signOut, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">ZenithrHelp</span>
            </Link>
          </div>

          /* {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <GlobalSearch />
          </div> */

          {/* Right Navigation */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* Admin Actions */}
                {isAdmin && (
                  <>
                    <Link to="/clients">
                      <Button variant="ghost" size="sm" className="hidden sm:flex">
                        <Users className="h-4 w-4 mr-2" />
                        Clients
                      </Button>
                    </Link>
                    <Link to="/products">
                      <Button variant="ghost" size="sm" className="hidden sm:flex">
                        <Plus className="h-4 w-4 mr-2" />
                        Products
                      </Button>
                    </Link>
                    <Link to="/support">
                      <Button variant="ghost" size="sm" className="hidden sm:flex">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Support
                      </Button>
                    </Link>
                  </>
                )}

                {/* Chat Support for Clients */}
                {!isAdmin && (
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                    3
                  </Badge>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt="User" />
                        <AvatarFallback>
                          {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-muted-foreground text-xs">{profile?.email}</p>
                      <Badge variant="secondary" className="mt-1 text-xs capitalize">
                        {profile?.role}
                      </Badge>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-button text-white border-0 shadow-button hover:shadow-lg">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;