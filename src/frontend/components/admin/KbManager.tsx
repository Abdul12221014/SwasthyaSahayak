/**
 * Knowledge Base Manager Component
 * 
 * Admin interface for:
 * - Uploading new health documents to KB
 * - Re-embedding KB when model version changes
 * - Viewing KB statistics
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/frontend/components/ui/select';
import { useToast } from '@/frontend/hooks/use-toast';
import { Upload, RefreshCw, Database } from 'lucide-react';

export function KbManager() {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reembedding, setReembedding] = useState(false);
  const { toast } = useToast();

  const INGEST_API_URL = import.meta.env.VITE_INGEST_API_URL || 
    'https://vcymocxqfbowuvihtdku.supabase.co/functions/v1/ingest-documents';
  const REEMBED_API_URL = import.meta.env.VITE_REEMBED_API_URL ||
    'https://vcymocxqfbowuvihtdku.supabase.co/functions/v1/reembed-kb';
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'change-me-in-production';

  const handleUpload = async () => {
    if (!title || !source || !content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const response = await fetch(INGEST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify({
          title,
          source,
          language,
          category: category || undefined,
          content
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ingestion failed');
      }

      toast({
        title: '✅ Document Ingested',
        description: `Created ${data.chunks_created} chunks with embeddings`
      });

      // Clear form
      setTitle('');
      setSource('');
      setContent('');
      setCategory('');

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReembed = async () => {
    setReembedding(true);

    try {
      const response = await fetch(REEMBED_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Re-embedding failed');
      }

      if (data.reembedded === false) {
        toast({
          title: 'KB Already Up-to-Date',
          description: `Current version: ${data.version}`
        });
      } else {
        toast({
          title: '✅ KB Re-embedded',
          description: `Updated ${data.documents_updated} documents to ${data.new_version}`
        });
      }

    } catch (error) {
      console.error('Re-embed error:', error);
      toast({
        title: 'Re-embed Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setReembedding(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Knowledge Base Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Ingest New Document</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                placeholder="WHO Malaria Fact Sheet"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source URL *</Label>
              <Input
                id="source"
                placeholder="https://who.int/..."
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="or">Odia</SelectItem>
                  <SelectItem value="as">Assamese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="vaccination, fever, malaria..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Document Content *</Label>
            <Textarea
              id="content"
              placeholder="Paste full document text here... (will be automatically chunked)"
              className="min-h-[150px] font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Content will be chunked into ~500 token segments with 70 token overlap
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !title || !source || !content}
            className="w-full"
          >
            {uploading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Ingesting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Ingest Document
              </>
            )}
          </Button>
        </div>

        {/* Re-embed Control */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Re-embed Knowledge Base</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Re-generate all embeddings when embedding model version changes.
            This ensures all KB documents use the latest model.
          </p>
          <Button
            onClick={handleReembed}
            disabled={reembedding}
            variant="outline"
            className="w-full"
          >
            {reembedding ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Re-embedding KB...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-embed All Documents
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

