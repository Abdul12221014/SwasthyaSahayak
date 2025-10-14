/**
 * Model Status Component
 * 
 * Displays ML model version information and health status
 * for the Admin Dashboard. Refreshes automatically every 60 seconds.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ModelVersions {
  embedding_model: string;
  emergency_classifier: string;
  translation_model: string;
  last_updated?: string;
}

interface ModelHealth {
  embedding: boolean;
  emergency_classifier: boolean;
  translation: boolean;
}

export function ModelStatus() {
  const [versions, setVersions] = useState<ModelVersions | null>(null);
  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

  const fetchModelStatus = async () => {
    try {
      // Fetch versions
      const versionsResponse = await fetch(`${ML_SERVICE_URL}/versions`, {
        signal: AbortSignal.timeout(2000),
      });
      
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData);
      }

      // Fetch health
      const healthResponse = await fetch(`${ML_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData.models);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch model status:', error);
      setVersions(null);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchModelStatus();

    // Refresh every 60 seconds
    const interval = setInterval(fetchModelStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const modelList = [
    { key: 'embedding_model' as const, name: 'Embedding Model', healthKey: 'embedding' as const },
    {
      key: 'emergency_classifier' as const,
      name: 'Emergency Classifier',
      healthKey: 'emergency_classifier' as const,
    },
    { key: 'translation_model' as const, name: 'Translation Model', healthKey: 'translation' as const },
  ];

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">ML Models Status</CardTitle>
        <RefreshCw
          className={`h-4 w-4 ${loading ? 'animate-spin' : ''} cursor-pointer text-muted-foreground hover:text-foreground`}
          onClick={() => {
            setLoading(true);
            fetchModelStatus();
          }}
        />
      </CardHeader>
      <CardContent>
        {loading && !versions ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions && health ? (
          <div className="space-y-3">
            {modelList.map(model => (
              <div key={model.key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {versions[model.key] || 'unknown'}
                  </div>
                </div>
                <Badge variant={health[model.healthKey] ? 'default' : 'destructive'} className="gap-1">
                  {health[model.healthKey] ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Online
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              {versions.last_updated && (
                <div className="text-xs text-muted-foreground">
                  Registry: {new Date(versions.last_updated).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <XCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-sm text-muted-foreground">ML Service Offline</div>
            <div className="text-xs text-muted-foreground mt-1">
              Cannot connect to {ML_SERVICE_URL}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

