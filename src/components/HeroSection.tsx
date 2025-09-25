import { Search, ArrowRight, BookOpen, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const HeroSection = () => {
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
              Welcome to{" "}
              <span className="text-primary-glow">Zenithr</span>{" "}
              Help Center
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Find answers, get support, and discover everything you need to succeed with our products
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto animate-slide-up">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder="What can we help you with today?" 
                className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur border-0 rounded-2xl shadow-2xl focus-visible:ring-2 focus-visible:ring-white/50"
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-button text-white border-0 rounded-xl px-6">
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3 animate-slide-up">
            {["Getting Started", "API Documentation", "Troubleshooting", "Video Tutorials"].map((link) => (
              <Button key={link} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">
                {link}
              </Button>
            ))}
          </div>

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