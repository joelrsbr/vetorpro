import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calculator, FileText, Sparkles, Eye, Brain, Pencil, Trash2,
  Loader2, Phone, Mail, MessageSquare, ChevronDown, User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ProposalsCRM, CRMProposal } from "./ProposalsCRM";

export interface NegotiationsSimulation {
  id: string;
  property_value: number;
  down_payment: number;
  interest_rate: number;
  term_months: number;
  amortization_type: string;
  monthly_payment: number;
  total_paid: number;
  total_interest: number;
  created_at: string;
  client_name: string | null;
  property_description: string | null;
}

interface Props {
  proposals: CRMProposal[];
  setProposals: React.Dispatch<React.SetStateAction<CRMProposal[]>>;
  simulations: NegotiationsSimulation[];
  loadingData: boolean;
  proposalLimit: number;
  isActive: boolean;
  dashCounts: { proposals_count: number } | null;
  formatCurrency: (n: number) => string;
  onViewProposal: (p: CRMProposal) => void;
  onEditProposal: (p: CRMProposal) => void;
  onDeleteProposal: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onCopyProposal: (text: string) => void;
  onEditSimulation: (s: NegotiationsSimulation) => void;
  onDeleteSimulation: (id: string) => void;
  onPaywall: () => void;
}

/* ─── Follow-up combined badge (status + age) ─── */
function getDaysSince(dateStr: string | null | undefined, fallback: string): number {
  const ref = dateStr || fallback;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

function CombinedFollowUpBadge({ status, days }: { status: string; days: number }) {
  // closed → neutral
  if (status === "closed") {
    return (
      <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        🟢 Fechado
      </Badge>
    );
  }
  // archived/lost → gray
  if (status === "archived" || status === "lost") {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 opacity-70">
        ⚪ Arquivado
      </Badge>
    );
  }
  // potential → pulse if >7 days
  if (status === "potential") {
    const urgent = days > 7;
    return (
      <Badge
        className={`text-[10px] px-1.5 py-0 bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-500 ${
          urgent ? "animate-pulse ring-2 ring-yellow-400" : ""
        }`}
      >
        🟡 Potencial · {days}d
      </Badge>
    );
  }
  // negotiating / completed → pulse if >3 days
  const urgent = days > 3;
  return (
    <Badge
      className={`text-[10px] px-1.5 py-0 bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-600 ${
        urgent ? "animate-pulse ring-2 ring-cyan-400" : ""
      }`}
    >
      🔵 Negociando · {days}d
    </Badge>
  );
}

function SimNoProposalBadge() {
  return (
    <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
      Sem proposta
    </Badge>
  );
}

/* ─── Unified row item (used in "Todas") ─── */
type UnifiedItem =
  | { kind: "proposal"; date: Date; data: CRMProposal }
  | { kind: "simulation"; date: Date; data: NegotiationsSimulation; hasProposal: boolean };

/* ─── Grouped by client view ─── */
function GroupedByClient({
  unified,
  renderItem,
  proposals,
}: {
  unified: UnifiedItem[];
  renderItem: (item: UnifiedItem) => JSX.Element;
  proposals: CRMProposal[];
}) {
  const [openClients, setOpenClients] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    for (const item of unified) {
      const name =
        (item.kind === "proposal" ? item.data.client_name : item.data.client_name) ||
        "Sem nome";
      const key = name.trim() || "Sem nome";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // sort items inside each group chronologically (newest first)
    const arr = Array.from(map.entries()).map(([client, items]) => {
      const sorted = [...items].sort((a, b) => b.date.getTime() - a.date.getTime());
      // Most recent interaction across this client's proposals
      const clientProposals = proposals.filter((p) => (p.client_name || "").trim() === client);
      const mostRecentProposal = clientProposals.sort((a, b) => {
        const da = new Date(a.ultima_interacao || a.created_at).getTime();
        const db = new Date(b.ultima_interacao || b.created_at).getTime();
        return db - da;
      })[0];
      const proposalCount = clientProposals.length;
      const simulationCount = items.filter((i) => i.kind === "simulation").length;
      return {
        client,
        items: sorted,
        latestDate: sorted[0].date,
        mostRecentProposal,
        proposalCount,
        simulationCount,
      };
    });
    return arr.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
  }, [unified, proposals]);

  const toggle = (client: string) => {
    setOpenClients((prev) => {
      const next = new Set(prev);
      next.has(client) ? next.delete(client) : next.add(client);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-6">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma negociação registrada ainda.</p>
        <Button variant="hero" size="sm" className="mt-3" asChild>
          <Link to="/calculadora">Iniciar primeira negociação</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {groups.map((g) => {
        const isOpen = openClients.has(g.client);
        const days = g.mostRecentProposal
          ? getDaysSince(g.mostRecentProposal.ultima_interacao, g.mostRecentProposal.created_at)
          : 0;
        return (
          <Collapsible key={g.client} open={isOpen} onOpenChange={() => toggle(g.client)}>
            <div className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden">
              <CollapsibleTrigger className="w-full p-3 sm:p-2 sm:px-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-sm truncate">{g.client}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {g.proposalCount} proposta{g.proposalCount !== 1 ? "s" : ""} ·{" "}
                      {g.simulationCount} simulaç{g.simulationCount !== 1 ? "ões" : "ão"}
                    </p>
                  </div>
                  {g.mostRecentProposal ? (
                    <CombinedFollowUpBadge status={g.mostRecentProposal.status} days={days} />
                  ) : (
                    <SimNoProposalBadge />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-2 pt-0 space-y-2 border-t border-border/40 bg-background/40">
                  <div className="pt-2 space-y-2">{g.items.map(renderItem)}</div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

export function NegotiationsPanel(props: Props) {
  const {
    proposals, setProposals, simulations, loadingData, proposalLimit, isActive,
    dashCounts, formatCurrency, onViewProposal, onEditProposal, onDeleteProposal,
    onUpdateStatus, onCopyProposal, onEditSimulation, onDeleteSimulation, onPaywall,
  } = props;

  const unified = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [
      ...proposals.map((p) => ({
        kind: "proposal" as const,
        date: new Date(p.created_at),
        data: p,
      })),
      ...simulations.map((s) => {
        const hasProposal = proposals.some(
          (p) => p.client_name === s.client_name && p.property_description === (s.property_description || "")
        );
        return {
          kind: "simulation" as const,
          date: new Date(s.created_at),
          data: s,
          hasProposal,
        };
      }),
    ];
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [proposals, simulations]);

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  if (loadingData) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Renders a unified item: desktop row + mobile card ─── */
  const renderUnifiedItem = (item: UnifiedItem) => {
    if (item.kind === "proposal") {
      const p = item.data;
      const days = getDaysSince(p.ultima_interacao, p.created_at);
      return (
        <div
          key={`p-${p.id}`}
          className="rounded-lg bg-muted/30 border border-border/50 p-3 sm:p-2 sm:px-3"
        >
          {/* Desktop: row */}
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 border-primary/30">
              <FileText className="h-2.5 w-2.5 mr-0.5" /> Proposta
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs truncate">{p.client_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {p.property_description} · {formatDateShort(item.date)}
              </p>
            </div>
            <CombinedFollowUpBadge status={p.status} days={days} />
            <div className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewProposal(p)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditProposal(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDeleteProposal(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile: card */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/5 border-primary/30">
                    <FileText className="h-2.5 w-2.5 mr-0.5" /> Proposta
                  </Badge>
                  <CombinedFollowUpBadge status={p.status} days={days} />
                </div>
                <p className="font-semibold text-sm mt-1 truncate">{p.client_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.property_description}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateShort(item.date)}</p>
              </div>
            </div>
            {/* Thumb-friendly actions */}
            <div className="flex gap-1.5 pt-1 border-t border-border/40">
              {p.client_phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-[11px] gap-1 border-green-600/30 text-green-700 hover:bg-green-50"
                  asChild
                >
                  <a href={`https://wa.me/${p.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </Button>
              )}
              {p.client_email && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-[11px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                  asChild
                >
                  <a href={`mailto:${p.client_email}`}>
                    <Mail className="h-3.5 w-3.5" /> E-mail
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => onViewProposal(p)}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Simulation
    const s = item.data;
    const propCount = dashCounts?.proposals_count ?? proposals.length;
    const canGenerateAI = propCount < proposalLimit && isActive;

    return (
      <div
        key={`s-${s.id}`}
        className="rounded-lg bg-muted/30 border border-border/50 p-3 sm:p-2 sm:px-3"
      >
        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0">
            <Calculator className="h-2.5 w-2.5 mr-0.5" /> {s.amortization_type.toUpperCase()}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs truncate">{s.client_name || "Sem nome"}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {formatCurrency(s.property_value)} · {formatCurrency(s.monthly_payment)}/mês · {formatDateShort(item.date)}
            </p>
          </div>
          {!item.hasProposal && <SimNoProposalBadge />}
          <div className="flex items-center shrink-0">
            {item.hasProposal ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => {
                    const existing = proposals.find(
                      (p) => p.client_name === s.client_name && p.property_description === (s.property_description || "")
                    );
                    if (existing) onViewProposal(existing);
                  }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver proposta</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${canGenerateAI ? "text-primary" : "text-muted-foreground opacity-50"}`}
                    onClick={() => { if (!canGenerateAI) { onPaywall(); return; } onEditSimulation(s); }}
                  >
                    <Brain className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{canGenerateAI ? "Gerar Proposta IA" : "Limite atingido"}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditSimulation(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDeleteSimulation(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  <Calculator className="h-2.5 w-2.5 mr-0.5" /> {s.amortization_type.toUpperCase()}
                </Badge>
                {item.hasProposal ? (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> Com IA
                  </Badge>
                ) : (
                  <SimNoProposalBadge />
                )}
              </div>
              <p className="font-semibold text-sm mt-1 truncate">{s.client_name || "Sem nome"}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {formatCurrency(s.property_value)} · {formatCurrency(s.monthly_payment)}/mês
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateShort(item.date)}</p>
            </div>
          </div>
          <div className="flex gap-1.5 pt-1 border-t border-border/40">
            <Button size="sm" variant="outline" className="flex-1 h-9 text-[11px]" onClick={() => onEditSimulation(s)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Abrir
            </Button>
            {!item.hasProposal && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-[11px] border-primary/30 text-primary"
                onClick={() => { if (!canGenerateAI) { onPaywall(); return; } onEditSimulation(s); }}
              >
                <Brain className="h-3.5 w-3.5 mr-1" /> Proposta IA
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-9 px-2 hover:text-destructive" onClick={() => onDeleteSimulation(s.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-3">
        <TabsTrigger value="all" className="text-xs">
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Todas
        </TabsTrigger>
        <TabsTrigger value="simulations" className="text-xs">
          <Calculator className="h-3.5 w-3.5 mr-1.5" /> Simulações
        </TabsTrigger>
        <TabsTrigger value="proposals" className="text-xs">
          <FileText className="h-3.5 w-3.5 mr-1.5" /> Propostas
        </TabsTrigger>
      </TabsList>

      {/* TODAS — agrupado por cliente */}
      <TabsContent value="all">
        <GroupedByClient unified={unified} renderItem={renderUnifiedItem} proposals={proposals} />
      </TabsContent>

      {/* SIMULAÇÕES — preserve original list */}
      <TabsContent value="simulations">
        {simulations.length === 0 ? (
          <div className="text-center py-6">
            <Calculator className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma simulação salva ainda.</p>
            <Button variant="hero" size="sm" className="mt-3" asChild>
              <Link to="/calculadora">Fazer Primeira Simulação</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {simulations.map((s) => {
              const hasProposal = proposals.some(
                (p) => p.client_name === s.client_name && p.property_description === (s.property_description || "")
              );
              return renderUnifiedItem({
                kind: "simulation",
                date: new Date(s.created_at),
                data: s,
                hasProposal,
              });
            })}
          </div>
        )}
      </TabsContent>

      {/* PROPOSTAS — preserve original CRM */}
      <TabsContent value="proposals">
        <ProposalsCRM
          proposals={proposals}
          setProposals={setProposals}
          loadingData={loadingData}
          onView={onViewProposal}
          onEdit={onEditProposal}
          onDelete={onDeleteProposal}
          onUpdateStatus={onUpdateStatus}
          onCopy={onCopyProposal}
        />
      </TabsContent>
    </Tabs>
  );
}
