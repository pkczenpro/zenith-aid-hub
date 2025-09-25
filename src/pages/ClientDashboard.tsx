import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  BookOpen, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  ExternalLink,
  Shield
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  industry: string;
  company: string;
  assignedProducts: string[];
}

interface Product {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  articles: number;
  lastUpdated: string;
}

const ClientDashboard = () => {
  const { clientId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock client data (in real app, this would be fetched from Supabase)
  const client: Client = {
    id: clientId || '1',
    name: 'John Smith',
    email: 'john@techcorp.com',
    industry: 'Technology',
    company: 'TechCorp Inc.',
    assignedProducts: ['mobile', 'web', 'api']
  };

  // All products with access status
  const allProducts: Product[] = [
    { 
      id: 'mobile', 
      name: 'Mobile App', 
      icon: '📱', 
      color: 'from-blue-500 to-blue-600', 
      description: 'iOS and Android app documentation',
      articles: 24,
      lastUpdated: '2024-01-20'
    },
    { 
      id: 'web', 
      name: 'Web Platform', 
      icon: '💻', 
      color: 'from-purple-500 to-purple-600', 
      description: 'Web application user guides',
      articles: 18,
      lastUpdated: '2024-01-19'
    },
    { 
      id: 'cloud', 
      name: 'Cloud Services', 
      icon: '☁️', 
      color: 'from-cyan-500 to-cyan-600', 
      description: 'Cloud infrastructure docs',
      articles: 32,
      lastUpdated: '2024-01-18'
    },
    { 
      id: 'security', 
      name: 'Security Suite', 
      icon: '🛡️', 
      color: 'from-emerald-500 to-emerald-600', 
      description: 'Security protocols and compliance',
      articles: 15,
      lastUpdated: '2024-01-17'
    },
    { 
      id: 'analytics', 
      name: 'Analytics', 
      icon: '📊', 
      color: 'from-orange-500 to-orange-600', 
      description: 'Data analytics and reporting',
      articles: 28,
      lastUpdated: '2024-01-16'
    },
    { 
      id: 'api', 
      name: 'API & Integrations', 
      icon: '⚡', 
      color: 'from-violet-500 to-violet-600', 
      description: 'API documentation and integrations',
      articles: 22,
      lastUpdated: '2024-01-15'
    }
  ];

  const accessibleProducts = allProducts.filter(product => 
    client.assignedProducts.includes(product.id)
  );

  const restrictedProducts = allProducts.filter(product => 
    !client.assignedProducts.includes(product.id)
  );

  const filteredAccessibleProducts = accessibleProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Documentation Portal</span>
            </Link>
          </div>
          
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documentation..."
                className="pl-10 pr-4 w-full bg-background border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{client.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{client.company}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-background via-muted/10 to-background border border-border/50 rounded-lg p-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {client.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground mb-4">
                Access your assigned documentation and resources for {client.company}
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {client.industry}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Access to {client.assignedProducts.length} products</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last login: Today</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accessible Products */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Your Documentation</h2>
                <p className="text-muted-foreground">Products and resources you have access to</p>
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                {accessibleProducts.length} Products Available
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAccessibleProducts.map((product) => (
                <Card key={product.id} className="shadow-card border-0 bg-gradient-card hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${product.color} text-white text-xl`}>
                          {product.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        <Shield className="h-3 w-3 mr-1" />
                        Access
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{product.articles} articles</span>
                      </div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Updated {product.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        asChild 
                        className="flex-1 bg-gradient-button text-white border-0 group-hover:shadow-md transition-all duration-200"
                      >
                        <Link to={`/docs/${product.id}/article-1`}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          View Documentation
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/docs/${product.id}/article-1`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAccessibleProducts.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse all available documentation.
                </p>
              </div>
            )}
          </div>

          {/* Restricted Products (for transparency) */}
          {restrictedProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Other Products</h2>
                  <p className="text-muted-foreground">Additional products that may be available</p>
                </div>
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                  Contact admin for access
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restrictedProducts.map((product) => (
                  <Card key={product.id} className="opacity-60 hover:opacity-75 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${product.color} text-white text-xl opacity-50`}>
                            {product.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-muted-foreground">{product.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          No Access
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{product.articles} articles</span>
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Updated {product.lastUpdated}</span>
                        </div>
                      </div>

                      <Button disabled className="w-full" variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Request Access
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;