import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type Registration = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  registered_at: string;
  scratch_cards: {
    serial_code: string;
    prizes: { name: string } | null;
    companies: { name: string } | null;
  } | null;
};

export const RegistrationsTable = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredData, setFilteredData] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await sb
        .from("registrations")
        .select(`
          *,
          scratch_cards(
            serial_code,
            prizes(name),
            companies(name)
          )
        `)
        .order("registered_at", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
      setFilteredData(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar cadastros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  useEffect(() => {
    const filtered = registrations.filter(
      (reg) =>
        reg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.customer_phone.includes(searchTerm) ||
        reg.scratch_cards?.serial_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, registrations]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cadastros de Clientes</CardTitle>
            <CardDescription>
              Acompanhe todos os cadastros realizados pelos clientes
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Total: {registrations.length}
          </Badge>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome, email, telefone ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum cadastro encontrado" : "Nenhum cadastro realizado ainda"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Prêmio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    {new Date(reg.registered_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{reg.customer_name}</TableCell>
                  <TableCell>{reg.customer_email}</TableCell>
                  <TableCell>{reg.customer_phone}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {reg.scratch_cards?.serial_code || "-"}
                  </TableCell>
                  <TableCell>{reg.scratch_cards?.companies?.name || "-"}</TableCell>
                  <TableCell>
                    {reg.scratch_cards?.prizes?.name ? (
                      <Badge>{reg.scratch_cards.prizes.name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
