import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Ticket className="h-4 w-4 text-primary-foreground" />
              </div>
              <span>Raspadinhas</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Sistema de gamificação para aumentar vendas e fidelizar clientes.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Navegação</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/cadastro" className="hover:text-primary transition-colors">
                  Cadastrar
                </Link>
              </li>
              <li>
                <Link to="/meus-pontos" className="hover:text-primary transition-colors">
                  Meus Pontos
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/auth" className="hover:text-primary transition-colors">
                  Acessar Sistema
                </Link>
              </li>
              <li>
                <a href="mailto:contato@raspadinhas.com" className="hover:text-primary transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Termos de Uso
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Privacidade
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Raspadinhas Premiadas. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
