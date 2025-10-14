import { useState, useEffect } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import { supabase } from "@/backend/integrations/supabase/client";
import { useToast } from "@/frontend/hooks/use-toast";
import { Send, Bot, User, AlertTriangle, ExternalLink } from "lucide-react";
import { debug } from "@/frontend/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  isEmergency?: boolean;
  language?: string;
}

const Chat = () => {
  useEffect(() => { 
    debug("MOUNT /chat"); 
    return () => debug("UNMOUNT /chat"); 
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Namaste! I am your health assistant. Ask me about vaccination, fever, malaria, TB, or any health concerns. I can respond in English, Hindi, Odia, or Assamese.',
      language: 'english'
    }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      language
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('health-query', {
        body: {
          user_language: language,
          query: input
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: data.id,
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        isEmergency: data.is_emergency,
        language: data.user_language
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.is_emergency) {
        toast({
          title: "⚠️ Emergency Detected",
          description: "This may require immediate medical attention. Please seek help.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SwasthyaSahayak</h1>
            <p className="text-sm text-muted-foreground">Your Rural Health Companion</p>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
              <SelectItem value="odia">ଓଡ଼ିଆ (Odia)</SelectItem>
              <SelectItem value="assamese">অসমীয়া (Assamese)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              
              <Card className={`max-w-[80%] ${message.isEmergency ? 'border-destructive' : ''} shadow-[var(--shadow-card)]`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                    {message.isEmergency && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Emergency
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.citations && message.citations.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.citations.map((citation, idx) => (
                          <a
                            key={idx}
                            href={citation.split(': ')[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {citation.split(': ')[0]}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground animate-pulse" />
              </div>
              <Card className="shadow-[var(--shadow-card)]">
                <CardContent className="p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about health concerns, vaccination, symptoms..."
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ℹ️ This service is for educational purposes only. For medical emergencies, call 108 or visit your nearest health center.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
