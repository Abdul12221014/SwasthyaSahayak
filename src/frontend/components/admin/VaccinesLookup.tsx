/**
 * Vaccines Lookup Component
 * 
 * Admin interface for looking up vaccination schedules by age.
 * Integrates with government API with curated fallback data.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from '@/frontend/hooks/use-toast';
import { Shield, Calendar } from 'lucide-react';

interface VaccineSchedule {
  age_months: number;
  age_group: string;
  vaccines: string[];
  message: string;
  source: string;
}

export function VaccinesLookup() {
  const [ageMonths, setAgeMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<VaccineSchedule | null>(null);
  const { toast } = useToast();

  const VACCINE_API_URL = import.meta.env.VITE_VACCINE_API_URL || 
    'https://vcymocxqfbowuvihtdku.supabase.co/functions/v1/vaccination-schedule';

  const validateAge = (age: string): boolean => {
    const months = parseInt(age);
    return !isNaN(months) && months >= 0 && months <= 216; // 0 to 18 years
  };

  const handleGetSchedule = async () => {
    if (!ageMonths.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter age in months',
        variant: 'destructive'
      });
      return;
    }

    const months = parseInt(ageMonths);
    if (!validateAge(ageMonths)) {
      toast({
        title: 'Validation Error',
        description: 'Age must be between 0 and 216 months (0-18 years)',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(VACCINE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          age_months: months
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch vaccination schedule');
      }

      setSchedule(data);

      toast({
        title: '✅ Schedule Retrieved',
        description: `Found ${data.vaccines?.length || 0} vaccines for ${data.age_group}`
      });

    } catch (error) {
      console.error('Vaccine lookup error:', error);
      toast({
        title: 'Lookup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgeDescription = (months: number): string => {
    if (months < 12) return `${months} months`;
    if (months < 60) return `${Math.floor(months / 12)} years ${months % 12} months`;
    return `${Math.floor(months / 12)} years`;
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Vaccination Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="age">Age (Months)</Label>
            <Input
              id="age"
              type="number"
              placeholder="e.g., 6, 12, 18..."
              min="0"
              max="216"
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter age in months (0-216 months = 0-18 years)
            </p>
          </div>

          <Button
            onClick={handleGetSchedule}
            disabled={loading || !ageMonths.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Calendar className="mr-2 h-4 w-4 animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Get Schedule
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {schedule && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">{schedule.age_group}</h4>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {schedule.message}
              </p>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">Recommended Vaccines:</h5>
                <div className="grid gap-2">
                  {schedule.vaccines.map((vaccine, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{vaccine}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Source: {schedule.source}</span>
                  <span>Updated: {new Date(schedule.last_updated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Age Examples */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {[0, 6, 12, 18, 24, 60].map((months) => (
              <Button
                key={months}
                variant="outline"
                size="sm"
                onClick={() => setAgeMonths(months.toString())}
                className="text-xs"
              >
                {getAgeDescription(months)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

