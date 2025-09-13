import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Loader2, Search, ExternalLink } from 'lucide-react';
import { useGeolocation, useRecyclingCentersSearch, getDirectionsUrl, mockRecyclingCenters, Location } from '@/lib/openstreetmap';

const RecyclingCenters: React.FC = () => {
  const { location, getCurrentLocation, loading: locating } = useGeolocation();
  const { centers, searchNearbyRecyclingCenters, loading } = useRecyclingCentersSearch();
  const [querying, setQuerying] = useState(false);

  const list = centers.length > 0 ? centers : mockRecyclingCenters;

  const handleFindNearby = async () => {
    setQuerying(true);
    try {
      const loc = await getCurrentLocation();
      await searchNearbyRecyclingCenters(loc, 10);
    } catch (e) {
      // noop (mock centers already shown)
    } finally {
      setQuerying(false);
    }
  };

  const userLoc: Location | null = location || (list[0] ? { lat: list[0].location.lat, lng: list[0].location.lng } : null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Recycling Centers</h1>
          <p className="text-muted-foreground">Find facilities near you and get directions.</p>
        </div>
        <Button onClick={handleFindNearby} disabled={querying || locating} className="bg-gradient-to-r from-eco-primary to-eco-secondary text-white">
          {(querying || locating) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
          Find Nearby
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>Interactive map integration can be added; showing list-based explorer for now.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {list.map((c) => (
                <Card key={c.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{c.name}</h3>
                        <p className="text-sm text-muted-foreground">{c.address}</p>
                        {c.distance !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">~{c.distance.toFixed(1)} km away</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="whitespace-nowrap">{c.amenity}</Badge>
                    </div>
                    {c.recycling_type && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.recycling_type.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      {userLoc && (
                        <a href={getDirectionsUrl(userLoc, c.location)} target="_blank" rel="noreferrer">
                          <Button size="sm" className="bg-gradient-to-r from-eco-primary to-eco-secondary text-white">
                            <Navigation className="w-4 h-4 mr-2" /> Directions
                          </Button>
                        </a>
                      )}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" /> Website
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and narrow down centers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or material" className="pl-9" />
              </div>
              <div className="text-sm text-muted-foreground">
                Tip: Use the Find Nearby button to auto-locate facilities around you.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecyclingCenters;

