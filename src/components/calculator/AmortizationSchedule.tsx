import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, List } from "lucide-react";

interface ScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  extraPayment: number;
}

interface AmortizationScheduleProps {
  schedule: ScheduleItem[];
}

export function AmortizationSchedule({ schedule }: AmortizationScheduleProps) {
  const [expanded, setExpanded] = useState(false);
  const displayedItems = expanded ? schedule : schedule.slice(0, 12);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Tabela de Amortização
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({schedule.length} parcelas)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Mês</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Amortização</TableHead>
                <TableHead>Juros</TableHead>
                <TableHead>Extra</TableHead>
                <TableHead>Saldo Devedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.map((item) => (
                <TableRow key={item.month}>
                  <TableCell className="font-medium">{item.month}</TableCell>
                  <TableCell>{formatBRL(item.payment)}</TableCell>
                  <TableCell>{formatBRL(item.principal)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatBRL(item.interest)}
                  </TableCell>
                  <TableCell className={item.extraPayment > 0 ? "text-success font-medium" : "text-muted-foreground"}>
                    {item.extraPayment > 0 ? formatBRL(item.extraPayment) : "-"}
                  </TableCell>
                  <TableCell className="font-medium">{formatBRL(item.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {schedule.length > 12 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="w-full md:w-auto"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Mostrar Menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver Todas as {schedule.length} Parcelas
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
