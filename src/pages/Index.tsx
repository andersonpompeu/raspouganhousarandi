import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, TrendingUp, Users, Sparkles, Award } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-pulse-slow">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Sistema de Raspadinhas Premiadas</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Aumente suas Vendas com Gamificação
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transforme suas vendas em uma experiência premiada. Fidelize clientes, aumente o ticket médio e capture dados valiosos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow" asChild>
                <Link to="/cadastro">Cadastrar Raspadinha</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/meus-pontos">
                  <Award className="mr-2 h-4 w-4" />
                  Meus Pontos
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Sistema completo de gestão de campanhas premiadas
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-card border-2 hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Aumente o Ticket Médio</CardTitle>
              <CardDescription>
                Clientes compram mais para ganhar raspadinhas premiadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Defina valor mínimo de compra (ex: R$ 45) e distribua raspadinhas automaticamente.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-2 hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-success rounded-lg flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-secondary-foreground" />
              </div>
              <CardTitle>Prêmios Atrativos</CardTitle>
              <CardDescription>
                Ofereça brindes, descontos e produtos gratuitos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure prêmios personalizados e controle a quantidade distribuída.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-2 hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <CardTitle>Capture Dados</CardTitle>
              <CardDescription>
                Cadastro fácil e rápido para validar prêmios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cada raspadinha tem código único. Cliente cadastra seus dados online e resgata seu prêmio.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">100%</div>
              <div className="text-muted-foreground">Rastreável</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-success bg-clip-text text-transparent mb-2">+45%</div>
              <div className="text-muted-foreground">Ticket Médio</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">3x</div>
              <div className="text-muted-foreground">Fidelização</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-success bg-clip-text text-transparent mb-2">Real-time</div>
              <div className="text-muted-foreground">Controle</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Transformar suas Vendas?
          </h2>
          <p className="text-muted-foreground mb-8">
            Tem uma raspadinha? Cadastre-se agora e participe da promoção!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow" asChild>
              <Link to="/cadastro">Cadastrar Raspadinha</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/dashboard">Acessar Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
