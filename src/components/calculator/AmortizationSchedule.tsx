import { Fragment, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, List, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ScheduleItem } from "./FinancingCalculator";
interface AmortizationScheduleProps {
  schedule: ScheduleItem[];
  amortizationType: "SAC" | "PRICE";
  locked?: boolean;
}

export function AmortizationSchedule({ schedule, amortizationType, locked = false }: AmortizationScheduleProps) {
  const [expanded, setExpanded] = useState(false);
  const displayedItems = locked ? schedule.slice(0, 3) : (expanded ? schedule : schedule.slice(0, 3));

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totals = useMemo(() => {
    return schedule.reduce(
      (acc, item) => ({
        totalInterest: acc.totalInterest + item.interest,
        totalFees: acc.totalFees + item.fees,
        totalExtraAmortization: acc.totalExtraAmortization + item.extraPayment,
      }),
      { totalInterest: 0, totalFees: 0, totalExtraAmortization: 0 }
    );
  }, [schedule]);

  const amortizationInfo = amortizationType === "SAC" 
    ? "SAC: Amortização constante. Os juros diminuem ao longo do tempo, resultando em parcelas decrescentes."
    : "PRICE: Parcelas fixas. No início, a maior parte é juros; no final, é amortização.";

  return (
    <TooltipProvider>
      <Card className="shadow-card w-full">
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
          <div className="overflow-x-auto px-1 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Data</TableHead>
                  <TableHead>Dívida</TableHead>
                  <TableHead>Correção</TableHead>
                  <TableHead>Dívida Corrigida</TableHead>
                  <TableHead>Juros</TableHead>
                  <TableHead>Amort. Mensal</TableHead>
                  <TableHead>Taxas/Seguros</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Amortização
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{amortizationInfo}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead>Saldo Residual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedItems.map((item) => (
                  <Fragment key={item.month}>
                    <TableRow 
                      key={item.month} 
                      className={item.hasReinforcement ? "bg-primary/5 font-semibold" : ""}
                    >
                      <TableCell className="font-medium capitalize">
                        {format(item.date, "MMM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatBRL(item.debt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.correction > 0 ? formatBRL(item.correction) : "-"}
                      </TableCell>
                      <TableCell>{formatBRL(item.correctedDebt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBRL(item.interest)}
                      </TableCell>
                      <TableCell>
                        {formatBRL(item.principal - item.extraPayment)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.fees > 0 ? formatBRL(item.fees) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{formatBRL(item.payment)}</TableCell>
                      <TableCell className={item.extraPayment > 0 ? "bg-primary/8 text-primary font-medium" : ""}>
                        {formatBRL(item.principal)}
                        {item.hasReinforcement && (
                          <span className="ml-1 text-xs text-primary">(+reforço)</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatBRL(item.balance)}</TableCell>
                    </TableRow>
                    {item.hasReinforcement && item.reinforcementAmount > 0 && (
                      <TableRow key={`${item.month}-reinforcement`} className="bg-primary/10 border-l-4 border-l-primary">
                        <TableCell colSpan={10} className="py-2 text-sm text-primary font-medium">
                          🔵 Reforço Estratégico: {formatBRL(item.reinforcementAmount)} aplicado em {format(item.date, "MMMM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/60 font-semibold">
                  <TableCell colSpan={4} className="text-right">Totais</TableCell>
                  <TableCell>{formatBRL(totals.totalInterest)}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{formatBRL(totals.totalFees)}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="bg-primary/10 text-primary font-bold rounded">
                    {formatBRL(totals.totalExtraAmortization)}
                  </TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              </TableFooter>
           </Table>
          </div>

          {locked && schedule.length > 3 && (
            <div className="relative mt-[-2rem] h-24 bg-gradient-to-t from-card via-card/90 to-transparent flex items-end justify-center pb-2">
              <p className="text-sm text-muted-foreground font-medium">
                🔒 Libere a tabela completa para visualizar todas as {schedule.length} parcelas
              </p>
            </div>
          )}

          {!locked && schedule.length > 12 && (
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
    </TooltipProvider>
  );
}
