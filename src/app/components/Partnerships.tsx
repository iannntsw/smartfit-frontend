import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, ExternalLink, ShoppingCart, Percent } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function Partnerships() {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const supplements = [
    {
      name: 'ProGain Whey Protein',
      brand: 'NutriFit',
      price: '$49.99',
      discount: '15% OFF',
      description: 'Premium whey protein isolate for muscle recovery',
      image: '🥛',
      link: 'https://example.com/protein'
    },
    {
      name: 'Pre-Workout Elite',
      brand: 'EnergyLab',
      price: '$34.99',
      discount: '20% OFF',
      description: 'Boost energy and focus for intense workouts',
      image: '⚡',
      link: 'https://example.com/preworkout'
    },
    {
      name: 'BCAA Recovery',
      brand: 'NutriFit',
      price: '$29.99',
      discount: '10% OFF',
      description: 'Essential amino acids for faster recovery',
      image: '💊',
      link: 'https://example.com/bcaa'
    }
  ];

  const equipment = [
    {
      name: 'Adjustable Dumbbells Set',
      brand: 'FlexFit',
      price: '$299.99',
      discount: '25% OFF',
      description: '5-50 lbs adjustable dumbbells with smart tracking',
      image: '🏋️',
      link: 'https://example.com/dumbbells'
    },
    {
      name: 'Resistance Bands Kit',
      brand: 'FlexFit',
      price: '$39.99',
      discount: '15% OFF',
      description: 'Complete set of resistance bands with door anchor',
      image: '🔗',
      link: 'https://example.com/bands'
    },
    {
      name: 'Yoga Mat Pro',
      brand: 'ZenFit',
      price: '$59.99',
      discount: '10% OFF',
      description: 'Extra thick non-slip exercise mat',
      image: '🧘',
      link: 'https://example.com/mat'
    }
  ];

  const apparel = [
    {
      name: 'Performance T-Shirt',
      brand: 'AthleteWear',
      price: '$29.99',
      discount: '20% OFF',
      description: 'Moisture-wicking performance fabric',
      image: '👕',
      link: 'https://example.com/shirt'
    },
    {
      name: 'Training Shorts',
      brand: 'AthleteWear',
      price: '$39.99',
      discount: '20% OFF',
      description: 'Lightweight with phone pocket',
      image: '🩳',
      link: 'https://example.com/shorts'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl">Partner Products</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl mb-2">Exclusive Partner Discounts</h2>
                <p className="text-indigo-100">
                  Save on supplements, equipment, and apparel from our trusted partners
                </p>
              </div>
              <Percent className="w-16 h-16 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Product Categories */}
        <Tabs defaultValue="supplements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="supplements">Supplements</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="apparel">Apparel</TabsTrigger>
          </TabsList>

          <TabsContent value="supplements" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supplements.map((product) => (
                <Card key={product.name} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-5xl mb-2">{product.image}</div>
                      <Badge variant="destructive">{product.discount}</Badge>
                    </div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.brand}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{product.price}</span>
                      <Button
                        size="sm"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        View Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipment.map((product) => (
                <Card key={product.name} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-5xl mb-2">{product.image}</div>
                      <Badge variant="destructive">{product.discount}</Badge>
                    </div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.brand}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{product.price}</span>
                      <Button
                        size="sm"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        View Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="apparel" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apparel.map((product) => (
                <Card key={product.name} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-5xl mb-2">{product.image}</div>
                      <Badge variant="destructive">{product.discount}</Badge>
                    </div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.brand}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{product.price}</span>
                      <Button
                        size="sm"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        View Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Details Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>{selectedProduct?.brand}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-6xl text-center">{selectedProduct?.image}</div>
            <p className="text-center">{selectedProduct?.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Special Price</div>
                <div className="text-3xl">{selectedProduct?.price}</div>
              </div>
              <Badge variant="destructive" className="text-lg py-2 px-4">
                {selectedProduct?.discount}
              </Badge>
            </div>
            <Button className="w-full" asChild>
              <a href={selectedProduct?.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Partner Store
              </a>
            </Button>
            <p className="text-xs text-gray-500 text-center">
              * Discount automatically applied at checkout
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
