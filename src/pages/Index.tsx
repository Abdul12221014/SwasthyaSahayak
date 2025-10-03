import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, BarChart3, Heart, Shield, Globe, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center mb-6">
          <Heart className="h-16 w-16 text-primary mr-4" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          SwasthyaSahayak
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          AI-Powered Health Companion for Rural India
        </p>
        <p className="text-lg mb-12 max-w-3xl mx-auto">
          Get instant health guidance in your language. Multilingual support for Odia, Hindi, Assamese, and English. 
          Powered by advanced AI with verified health information from WHO, MoHFW, and UNICEF.
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <Button 
            size="lg" 
            onClick={() => navigate('/chat')}
            className="px-8 py-6 text-lg shadow-[var(--shadow-elevated)] hover:scale-105 transition-transform"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Start Chat
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate('/admin')}
            className="px-8 py-6 text-lg shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all"
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Admin Dashboard
          </Button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why SwasthyaSahayak?</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all border-l-4 border-l-primary">
            <CardContent className="p-6">
              <Globe className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multilingual Support</h3>
              <p className="text-muted-foreground">
                Ask questions in Odia, Hindi, Assamese, or English. We understand your language.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all border-l-4 border-l-accent">
            <CardContent className="p-6">
              <Shield className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Emergency Detection</h3>
              <p className="text-muted-foreground">
                Automatic emergency alerts for critical symptoms with immediate guidance to seek help.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all border-l-4 border-l-success">
            <CardContent className="p-6">
              <Zap className="h-12 w-12 text-success mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verified Information</h3>
              <p className="text-muted-foreground">
                All responses backed by WHO, MoHFW guidelines with clear source citations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-card/50 backdrop-blur-sm py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center max-w-5xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4+</div>
              <div className="text-sm text-muted-foreground">Languages Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Always Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-success mb-2">Free</div>
              <div className="text-sm text-muted-foreground">No Cost Service</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Powered Assistance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t">
        <p className="mb-2">
          ⚠️ <strong>Disclaimer:</strong> This service is for educational purposes only and is not a substitute for professional medical advice.
        </p>
        <p>For medical emergencies, call 108 or visit your nearest Primary Health Centre.</p>
      </footer>
    </div>
  );
};

export default Index;
