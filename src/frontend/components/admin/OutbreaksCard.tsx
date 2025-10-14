/**
 * Outbreaks Card Component
 * 
 * Admin interface for checking outbreak alerts by district.
 * Integrates with government API with fallback data.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { useToast } from '@/frontend/hooks/use-toast';
import { AlertTriangle, Search } from 'lucide-react';

interface OutbreakAlert {
  district: string;
  disease: string;
  cases: number;
  last_updated: string;
}

export function OutbreaksCard() {
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [outbreaks, setOutbreaks] = useState<OutbreakAlert[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const { toast } = useToast();

  const OUTBREAK_API_URL = import.meta.env.VITE_OUTBREAK_API_URL || 
    'https://vcymocxqfbowuvihtdku.supabase.co/functions/v1/outbreak-alerts';

  const handleCheckOutbreaks = async () => {
    if (!district.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a district name',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(OUTBREAK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          district: district.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch outbreak alerts');
      }

      setOutbreaks(data.outbreaks || []);
      setTotalCases(data.total_cases || 0);

      toast({
        title: '✅ Outbreak Data Retrieved',
        description: `Found ${data.outbreaks?.length || 0} outbreaks in ${district}`
      });

    } catch (error) {
      console.error('Outbreak check error:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const districts = [
    'Cuttack', 'Bhubaneswar', 'Puri', 'Balasore', 'Sambalpur',
    'Rourkela', 'Berhampur', 'Koraput', 'Bhadrak', 'Baripada'
  ];

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Outbreak Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger id="district">
                <SelectValue placeholder="Select district..." />
              </SelectTrigger>
              <SelectContent>
                {districts.map((dist) => (
                  <SelectItem key={dist} value={dist}>
                    {dist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCheckOutbreaks}
            disabled={loading || !district.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Check Outbreaks
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {outbreaks.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Total Cases: <span className="font-semibold text-foreground">{totalCases}</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Outbreaks:</h4>
              <div className="space-y-2">
                {outbreaks.map((outbreak, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{outbreak.disease}</div>
                        <div className="text-xs text-muted-foreground">
                          Last updated: {new Date(outbreak.last_updated).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg text-red-600">
                          {outbreak.cases}
                        </div>
                        <div className="text-xs text-muted-foreground">cases</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {outbreaks.length === 0 && !loading && district && (
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active outbreaks found in {district}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

