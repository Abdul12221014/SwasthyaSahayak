import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, BarChart3, Globe, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QueryLog {
  id: string;
  user_language: string;
  original_query: string;
  translated_query: string;
  response: string;
  citations: string[];
  is_emergency: boolean;
  accuracy_rating: string;
  created_at: string;
}

interface Analytics {
  totalQueries: number;
  emergencyCount: number;
  accuracyPercentage: number;
  languageDistribution: Record<string, number>;
  topQueries: Array<{ word: string; count: number }>;
  weeklyEmergencies: number;
  ratedQueriesCount: number;
}

const Admin = () => {
  const [queries, setQueries] = useState<QueryLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('health_queries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_queries'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch queries
      const { data: queriesData, error: queriesError } = await supabase.functions.invoke('admin-queries');
      
      if (queriesError) throw queriesError;
      
      setQueries(queriesData.queries || []);

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('admin-queries/analytics');
      
      if (analyticsError) throw analyticsError;
      
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAccuracy = async (id: string, rating: 'correct' | 'incorrect') => {
    try {
      const { error } = await supabase.functions.invoke(`admin-queries/${id}`, {
        method: 'PATCH',
        body: { accuracy_rating: rating }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Query marked as ${rating}`
      });

      fetchData();
    } catch (error) {
      console.error('Error updating accuracy:', error);
      toast({
        title: "Error",
        description: "Failed to update accuracy rating",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Health Chatbot Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor queries, validate responses, and track health insights</p>
      </header>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalQueries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time queries processed</p>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.accuracyPercentage || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {analytics?.ratedQueriesCount || 0} validated queries
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emergency Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{analytics?.emergencyCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.weeklyEmergencies || 0} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Languages Served</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(analytics?.languageDistribution || {}).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active languages</p>
          </CardContent>
        </Card>
      </div>

      {/* Language Distribution */}
      <Card className="mb-8 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Language Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(analytics?.languageDistribution || {}).map(([lang, count]) => (
              <Badge key={lang} variant="secondary" className="px-4 py-2">
                {lang}: {count} queries
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Query Topics */}
      <Card className="mb-8 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Top Query Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analytics?.topQueries.map((item, idx) => (
              <Badge key={idx} variant="outline" className="px-3 py-1">
                {item.word} ({item.count})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Logs Table */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Query Validation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead>Emergency</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queries.map((query) => (
                  <TableRow key={query.id}>
                    <TableCell className="text-xs">
                      {new Date(query.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{query.user_language}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm font-medium mb-1">
                        {query.original_query.substring(0, 100)}...
                      </div>
                      {query.translated_query && (
                        <div className="text-xs text-muted-foreground">
                          Translated: {query.translated_query.substring(0, 100)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {query.is_emergency && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Emergency
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {query.accuracy_rating === 'correct' && (
                        <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                          <CheckCircle className="h-3 w-3" />
                          Correct
                        </Badge>
                      )}
                      {query.accuracy_rating === 'incorrect' && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Incorrect
                        </Badge>
                      )}
                      {query.accuracy_rating === 'pending' && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAccuracy(query.id, 'correct')}
                          disabled={query.accuracy_rating === 'correct'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAccuracy(query.id, 'incorrect')}
                          disabled={query.accuracy_rating === 'incorrect'}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
