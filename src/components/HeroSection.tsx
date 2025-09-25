import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowRight, BookOpen, Users, MessageCircle, Plus, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, profile, isAdmin } = useAuth();

  const stats = [
    { icon: BookOpen, label: "Articles", value: "500+" },
    { icon: Users, label: "Happy Users", value: "10K+" },
    { icon: MessageCircle, label: "Tickets Resolved", value: "25K+" },
  ];

  return (
    <section className="relative py-20 px-4 bg-gradient-hero overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary-glow/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              {user ? (
                <>
                  Welcome back,{" "}
                  <span className="text-primary-glow">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                </>
              ) : (
                <>
                  Welcome to{" "}
                  <span className="text-primary-glow">ZenithrHelp</span>
                </>
              )}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {user 
                ? `${isAdmin ? 'Manage your help center and support your clients' : 'Find answers and get the support you need'}`
                : 'Find answers, get support, and discover everything you need to succeed with our products'
              }
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto animate-slide-up">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder={user ? "Search your documentation..." : "What can we help you with today?"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur border-0 rounded-2xl shadow-2xl focus-visible:ring-2 focus-visible:ring-white/50"
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-button text-white border-0 rounded-xl px-6">
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          {user && (
            <div className="flex flex-wrap justify-center gap-3 animate-slide-up">
              {isAdmin 
                ? ["Client Management", "Documentation Editor", "Analytics", "Settings"].map((link) => (
                    <Button key={link} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      {link}
                    </Button>
                  ))
                : ["Getting Started", "My Products", "Support Tickets", "FAQ"].map((link) => (
                    <Button key={link} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      {link}
                    </Button>
                  ))
              }
            </div>
          )}

          {/* Actions */}
          {user ? (
            <div className="flex justify-center gap-4 mt-8 animate-slide-up">
              {isAdmin ? (
                <>
                  <Link to="/clients">
                    <Button 
                      variant="outline" 
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Clients
                    </Button>
                  </Link>
                  <Link to="/products">
                    <Button 
                      className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Manage Products
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Get Support
                  </Button>
                  <Button 
                    className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Documentation
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex justify-center gap-4 mt-8 animate-slide-up">
              <Link to="/auth">
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button 
                  className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-slide-up">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur border-white/20 card-hover">
                <CardContent className="p-6 text-center">
                  <stat.icon className="h-8 w-8 text-white mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;