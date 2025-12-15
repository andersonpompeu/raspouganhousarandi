import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, TrendingUp, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="h-4 w-4" />
              Sistema de Raspadinhas Premiadas
            </div>
            <h1 className="mb-6">
              Transforme Vendas em{" "}
              <span className="text-gradient">Experiências Premiadas</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Aumente o ticket médio, fidelize clientes e capture dados valiosos
              com nosso sistema de gamificação.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/cadastro">
                  Cadastrar Raspadinha
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/meus-pontos">Ver Meus Pontos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="mb-4">Como Funciona</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sistema completo de gestão de campanhas premiadas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover border-0 shadow-card">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aumente o Ticket Médio</h3>
                <p className="text-sm text-muted-foreground">
                  Defina valor mínimo de compra e distribua raspadinhas
                  automaticamente para incentivar compras maiores.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-card">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Prêmios Atrativos</h3>
                <p className="text-sm text-muted-foreground">
                  Configure prêmios personalizados como brindes, descontos e
                  produtos gratuitos para seus clientes.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-card">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Capture Dados</h3>
                <p className="text-sm text-muted-foreground">
                  Cada raspadinha tem código único. Clientes cadastram seus dados
                  online e você constrói sua base.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Rastreável</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">+45%</div>
              <div className="text-sm text-muted-foreground">Ticket Médio</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">3x</div>
              <div className="text-sm text-muted-foreground">Fidelização</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">Real-time</div>
              <div className="text-sm text-muted-foreground">Controle</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="mb-4">Pronto para Começar?</h2>
            <p className="text-muted-foreground mb-8">
              Tem uma raspadinha? Cadastre-se agora e participe da promoção!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/cadastro">
                  Cadastrar Raspadinha
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Acessar Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
