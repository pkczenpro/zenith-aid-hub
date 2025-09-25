import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Monitor, 
  Cloud, 
  Shield, 
  BarChart3, 
  Zap,
  ArrowRight,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProductCategories = () => {
  const navigate = useNavigate();
  const products = [
    {
      id: "mobile",
      name: "Mobile App",
      description: "iOS and Android applications with seamless user experience",
      icon: Smartphone,
      articles: 45,
      color: "from-blue-500 to-blue-600",
      tours: 3
    },
    {
      id: "web",
      name: "Web Platform", 
      description: "Comprehensive web dashboard and management tools",
      icon: Monitor,
      articles: 62,
      color: "from-purple-500 to-purple-600",
      tours: 5
    },
    {
      id: "cloud",
      name: "Cloud Services",
      description: "Scalable cloud infrastructure and deployment solutions",
      icon: Cloud,
      articles: 38,
      color: "from-cyan-500 to-cyan-600",
      tours: 2
    },
    {
      id: "security",
      name: "Security Suite",
      description: "Advanced security features and compliance tools",
      icon: Shield,
      articles: 29,
      color: "from-emerald-500 to-emerald-600",
      tours: 4
    },
    {
      id: "analytics",
      name: "Analytics",
      description: "Data insights and performance monitoring dashboard",
      icon: BarChart3,
      articles: 34,
      color: "from-orange-500 to-orange-600",
      tours: 3
    },
    {
      id: "api",
      name: "API & Integrations",
      description: "Developer tools and third-party integrations",
      icon: Zap,
      articles: 41,
      color: "from-violet-500 to-violet-600",
      tours: 6
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-gradient">
            Explore by Product
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your product to find specific guides, tutorials, and documentation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="group cursor-pointer card-hover border-0 shadow-card bg-gradient-card"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${product.color} shadow-lg`}>
                    <product.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {product.articles} articles
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {product.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <PlayCircle className="h-4 w-4" />
                    <span>{product.tours} video tours</span>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group/btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/product/${product.id}`);
                    }}
                  >
                    Manage
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCategories;