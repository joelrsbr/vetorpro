import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, Pencil, Trash2, Loader2, Phone, Mail, MessageSquare,
  ChevronDown, CheckCircle2, Copy, ArrowUp, ArrowDown, ArrowUpDown, Search, X, Filter,
  TrendingUp, Clock, Target, AlertTriangle, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { CRMProposal } from "./ProposalsCRM";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NegotiationsSimulation {
  id: string;
  status?: string | null;
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
  onUpdateSimulationStatus: (id: string, status: string) => void;
  onCopyProposal: (text: string) => void;
  onEditSimulation: (s: NegotiationsSimulation) => void;
  onDeleteSimulation: (id: string) => void;
  onPaywall: () => void;
}

/* ─── helpers ─── */
/**
 * Days since first contact (proposta criada). Nunca usa ultima_interacao —
 * a contagem representa o tempo total da negociação desde o 1º contato e
 * é usada em relatórios futuros de tempo médio até fechamento.
 */
function getDaysSinceFirstContact(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

const SIM_STATUS_OVERRIDES_KEY = "vetorpro:sim-status-overrides";

function getSimulationStatus(sim: NegotiationsSimulation): string {
  return sim.status || "potential";
}

const STATUS_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "potential", label: "Potencial", emoji: "🟡" },
  { value: "negotiating", label: "Negociando", emoji: "🔵" },
  { value: "closed", label: "Fechado", emoji: "🟢" },
  { value: "lost", label: "Perdido", emoji: "🔴" },
  { value: "archived", label: "Arquivado", emoji: "⚪" },
];

function StatusBadgeMenu({
  status,
  days,
  isActive,
  onChange,
}: {
  status: string;
  days: number;
  isActive?: boolean;
  onChange: (status: string) => void;
}) {
  const ringActive = isActive ? "ring-2 ring-offset-1 ring-primary" : "";

  let cls = "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-600";
  let label = `🔵 Negociando · ${days}d`;
  if (status === "closed") {
    cls = "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
    label = "🟢 Fechado";
  } else if (status === "lost") {
    cls = "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
    label = "🔴 Perdido";
  } else if (status === "archived") {
    cls = "bg-muted text-muted-foreground border-border opacity-70 hover:bg-muted";
    label = "⚪ Arquivado";
  } else if (status === "potential") {
    const urgent = days > 7;
    cls = `bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-500 ${urgent && !isActive ? "animate-pulse ring-2 ring-yellow-400" : ""}`;
    label = `🟡 Potencial · ${days}d`;
  } else {
    const urgent = days > 3;
    cls = `bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-600 ${urgent && !isActive ? "animate-pulse ring-2 ring-cyan-400" : ""}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="focus:outline-none"
          title="Clique para alterar o status"
        >
          <Badge className={`text-[10px] px-1.5 py-0 cursor-pointer transition-all hover:scale-105 inline-flex items-center gap-1 ${cls} ${ringActive}`}>
            {label}
            <ChevronDown className="h-2.5 w-2.5 opacity-80" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          Alterar status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUS_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
            className="text-xs gap-2"
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
            {opt.value === status && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_LABELS: Record<string, string> = {
  potential: "🟡 Potencial",
  negotiating: "🔵 Negociando",
  closed: "🟢 Fechado",
  lost: "🔴 Perdido",
  archived: "⚪ Arquivado",
};

function extractPropertyValue(text: string): string {
  const match = text.match(/R\$\s?[\d.,]+/);
  return match ? match[0] : "R$ —";
}

function getTemplates(name: string, value: string) {
  return [
    {
      label: "Gentil",
      text: `Olá, ${name}! Tudo bem? Passando para saber se ainda tem interesse na proposta de ${value}. Fico à disposição!`,
    },
    {
      label: "Urgência",
      text: `Oi, ${name}! A proposta de ${value} que preparei para você ainda está válida. As taxas podem mudar em breve — quer aproveitar?`,
    },
    {
      label: "Valor",
      text: `${name}, lembrei de você! Aquela simulação de ${value} pode ser o primeiro passo para realizar seu objetivo. Posso te ajudar a avançar?`,
    },
  ];
}

/* ─── Single proposal row (used for primary + expanded extras) ─── */
function ProposalRow({
  p,
  formatDateShort,
  isPrimary,
  onView,
  onEdit,
  onDelete,
  onMessage,
  onContactToday,
  onCopy,
  onStatusBadgeClick,
  onChangeStatus,
  activeStatusFilter,
}: {
  p: CRMProposal;
  formatDateShort: (d: Date) => string;
  isPrimary: boolean;
  onView: (p: CRMProposal) => void;
  onEdit: (p: CRMProposal) => void;
  onDelete: (id: string) => void;
  onMessage: (p: CRMProposal) => void;
  onContactToday: (p: CRMProposal) => void;
  onCopy: (text: string) => void;
  onStatusBadgeClick?: (status: string) => void;
  onChangeStatus: (id: string, status: string) => void;
  activeStatusFilter?: string | null;
}) {
  const days = getDaysSinceFirstContact(p.created_at);
  const lastInteractionDays = Math.floor(
    (Date.now() - new Date(p.ultima_interacao || p.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStalled = p.status === "negotiating" && lastInteractionDays > 7;
  const stalledBadge = isStalled ? (
    <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1">
      <AlertTriangle className="h-2.5 w-2.5" />
      Atenção: Parado
    </Badge>
  ) : null;
  return (
    <div
      className={`rounded-lg border p-3 sm:p-2 sm:px-3 ${
        isPrimary ? "bg-muted/30 border-border/50" : "bg-background/40 border-border/40"
      }`}
    >
      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="hidden md:flex flex-col items-start shrink-0 w-[72px]">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70 leading-none">1º contato</span>
          <span className="text-[11px] font-medium tabular-nums text-foreground/80 mt-0.5">
            {formatDateShort(new Date(p.created_at))}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate">{p.client_name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {p.property_description} · {extractPropertyValue(p.proposal_text)}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
          <StatusBadgeMenu
            status={p.status}
            days={getDaysSinceFirstContact(p.created_at)}
            isActive={activeStatusFilter === p.status}
            onChange={(s) => onChangeStatus(p.id, s)}
          />
          {stalledBadge}
        </div>
        <div className="flex items-center shrink-0">
          {p.client_phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" asChild>
                  <a href={`https://wa.me/${p.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          )}
          {p.client_email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600" asChild>
                  <a href={`mailto:${p.client_email}`}>
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>E-mail</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => onMessage(p)}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar Mensagem</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-green-600" onClick={() => onContactToday(p)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Falei com ele hoje</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(p)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadgeMenu
              status={p.status}
              days={getDaysSinceFirstContact(p.created_at)}
              isActive={activeStatusFilter === p.status}
              onChange={(s) => onChangeStatus(p.id, s)}
            />
            {stalledBadge}
          </div>
          <p className="font-semibold text-sm mt-1 truncate">{p.client_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {p.property_description} · {extractPropertyValue(p.proposal_text)}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground/80">
            <span>1º contato: <span className="tabular-nums text-foreground/70">{formatDateShort(new Date(p.created_at))}</span></span>
            <span>Último: <span className="tabular-nums text-foreground/70">{formatDateShort(new Date(p.ultima_interacao || p.created_at))}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {p.client_phone && (
            <Button size="sm" variant="outline" className="flex-1 min-w-[90px] h-9 text-[11px] gap-1 border-green-600/30 text-green-700" asChild>
              <a href={`https://wa.me/${p.client_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Phone className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          )}
          {p.client_email && (
            <Button size="sm" variant="outline" className="flex-1 min-w-[80px] h-9 text-[11px] gap-1 border-blue-500/30 text-blue-600" asChild>
              <a href={`mailto:${p.client_email}`}>
                <Mail className="h-3.5 w-3.5" /> E-mail
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1 min-w-[100px] h-9 text-[11px] gap-1" onClick={() => onMessage(p)}>
            <MessageSquare className="h-3.5 w-3.5" /> Mensagem
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-w-[100px] h-9 text-[11px] gap-1 border-green-600/30 text-green-700" onClick={() => onContactToday(p)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Falei hoje
          </Button>
          <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => onView(p)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => onEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-9 px-2 hover:text-destructive" onClick={() => onDelete(p.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NegotiationsPanel(props: Props) {
  const {
    proposals, setProposals, simulations, loadingData,
    formatCurrency, onViewProposal, onEditProposal, onDeleteProposal,
    onCopyProposal, onEditSimulation, onDeleteSimulation, onUpdateStatus, onUpdateSimulationStatus,
  } = props;

  const isSimEntry = (id: string) => id.startsWith("sim:");
  const stripSimId = (id: string) => id.replace(/^sim:/, "");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIM_STATUS_OVERRIDES_KEY);
      if (!raw) return;
      const legacyOverrides = JSON.parse(raw) as Record<string, string>;
      Object.entries(legacyOverrides).forEach(([simId, status]) => {
        if (["potential", "negotiating", "closed", "lost", "archived"].includes(status)) {
          onUpdateSimulationStatus(simId, status);
        }
      });
      localStorage.removeItem(SIM_STATUS_OVERRIDES_KEY);
    } catch {
      localStorage.removeItem(SIM_STATUS_OVERRIDES_KEY);
    }
  }, [onUpdateSimulationStatus]);

  const handleChangeStatus = (id: string, status: string) => {
    if (isSimEntry(id)) {
      onUpdateSimulationStatus(stripSimId(id), status);
      return;
    }
    onUpdateStatus(id, status);
  };

  const handleEdit = (p: CRMProposal) => {
    if (isSimEntry(p.id)) {
      const sim = simulations.find(s => s.id === stripSimId(p.id));
      if (sim) onEditSimulation(sim);
      return;
    }
    onEditProposal(p);
  };
  const handleDelete = (id: string) => {
    if (isSimEntry(id)) { onDeleteSimulation(stripSimId(id)); return; }
    onDeleteProposal(id);
  };
  const handleView = (p: CRMProposal) => {
    if (isSimEntry(p.id)) {
      const sim = simulations.find(s => s.id === stripSimId(p.id));
      if (sim) onEditSimulation(sim);
      return;
    }
    onViewProposal(p);
  };
  const handleCopy = (text: string) => {
    onCopyProposal(text);
  };
  const { toast } = useToast();
  const [msgModal, setMsgModal] = useState<CRMProposal | null>(null);
  const [confirmContact, setConfirmContact] = useState<CRMProposal | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"client" | "first" | "last">("last");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleStatusBadgeClick = (status: string) => {
    setStatusFilter(prev => (prev === status ? null : status));
  };

  const handleSort = (key: "client" | "first" | "last") => {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  const registerContact = async (proposal: CRMProposal) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("proposals")
      .update({ ultima_interacao: now } as any)
      .eq("id", proposal.id);
    if (!error) {
      setProposals(prev =>
        prev.map(p => p.id === proposal.id ? { ...p, ultima_interacao: now } : p)
      );
      toast({
        title: `Follow-up atualizado para ${proposal.client_name}!`,
        duration: 3000,
      });
    }
  };

  const handleCopyTemplate = async (text: string, proposal: CRMProposal) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada! 📋" });
    await registerContact(proposal);
    setMsgModal(null);
  };

  const INACTIVE_STATUSES = new Set(["closed", "lost", "archived"]);

  /* Synthesize virtual CRM entries from saved simulations that don't yet have an AI proposal,
     so simulations from any mode (Padrão, Manual, Negociação Direta) appear in the CRM. */
  const allEntries = useMemo<CRMProposal[]>(() => {
    const proposalSimIds = new Set<string>();
    const proposalKeys = new Set<string>();
    for (const p of proposals) {
      const anyP = p as any;
      if (anyP.simulation_id) proposalSimIds.add(anyP.simulation_id);
      proposalKeys.add(`${(p.client_name || "").trim().toLowerCase()}|${(p.property_description || "").trim().toLowerCase()}`);
    }
    const synthesized: CRMProposal[] = [];
    for (const s of simulations) {
      if (proposalSimIds.has(s.id)) continue;
      const key = `${(s.client_name || "").trim().toLowerCase()}|${(s.property_description || "").trim().toLowerCase()}`;
      if (proposalKeys.has(key)) continue;
      const valueStr = formatCurrency(s.property_value);
      synthesized.push({
        id: `sim:${s.id}`,
        client_name: s.client_name || "Sem nome",
        property_description: s.property_description || "—",
        proposal_text: `Simulação salva — Imóvel: ${valueStr}. Parcela: ${formatCurrency(s.monthly_payment)}.`,
        interest_savings: null,
        term_savings_months: null,
        created_at: s.created_at,
        status: getSimulationStatus(s),
        ultima_interacao: s.created_at,
        client_phone: (s as any).client_phone ?? null,
        client_email: (s as any).client_email ?? null,
      });
    }
    return [...proposals, ...synthesized];
  }, [proposals, simulations, formatCurrency]);

  /* Group entries by client; sort each client's entries newest-first */
  const clientGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusFiltered = statusFilter
      ? allEntries.filter(p => p.status === statusFilter)
      : allEntries;
    const filtered = q
      ? statusFiltered.filter(p => {
          const sim = simulations.find(s => s.id === stripSimId(p.id)) ||
            simulations.find(s => (s.client_name || "") === p.client_name && (s.property_description || "") === p.property_description);

          const tipo = sim ? (sim.amortization_type || "") : "";
          const valorNum = sim ? Number(sim.property_value) || 0 : 0;
          const valorFmt = sim ? formatCurrency(valorNum) : "";
          const valorDigits = sim ? String(Math.round(valorNum)) : "";
          const created = p.created_at ? new Date(p.created_at) : null;
          const interacao = p.ultima_interacao ? new Date(p.ultima_interacao) : null;
          const fmtDate = (d: Date | null) =>
            d ? `${d.toLocaleDateString("pt-BR")} ${d.toISOString().slice(0, 10)}` : "";

          const haystack = [
            p.client_name, p.property_description, p.proposal_text,
            p.client_email, p.client_phone, tipo,
            valorFmt, valorDigits,
            fmtDate(created), fmtDate(interacao),
          ].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(q);
        })
      : statusFiltered;
    const map = new Map<string, CRMProposal[]>();
    for (const p of filtered) {
      const key = (p.client_name || "Sem nome").trim() || "Sem nome";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const groups = Array.from(map.entries()).map(([client, items]) => {
      const sorted = [...items].sort((a, b) => {
        const da = new Date(a.ultima_interacao || a.created_at).getTime();
        const db = new Date(b.ultima_interacao || b.created_at).getTime();
        return db - da; // newest first inside the client
      });
      const primary = sorted[0];
      const oldestLast = Math.min(
        ...sorted.map(p => new Date(p.ultima_interacao || p.created_at).getTime())
      );
      const oldestFirst = Math.min(
        ...sorted.map(p => new Date(p.created_at).getTime())
      );
      // Inactive if ALL proposals of the client are inactive
      const allInactive = sorted.every(p => INACTIVE_STATUSES.has(p.status));
      return { client, primary, others: sorted.slice(1), oldestLast, oldestFirst, allInactive };
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const compare = (a: typeof groups[number], b: typeof groups[number]) => {
      // Priority: active first, inactive (closed/lost/archived) last — regardless of sort
      if (a.allInactive !== b.allInactive) return a.allInactive ? 1 : -1;
      if (sortKey === "client") return a.client.localeCompare(b.client, "pt-BR") * dir;
      if (sortKey === "first") return (a.oldestFirst - b.oldestFirst) * dir;
      return (a.oldestLast - b.oldestLast) * dir; // "last"
    };
    return groups.sort(compare);
  }, [allEntries, statusFilter, sortKey, sortDir, searchQuery, simulations, formatCurrency]);

  const toggleClient = (client: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(client) ? next.delete(client) : next.add(client);
      return next;
    });
  };

  const SortIcon = ({ col }: { col: "client" | "first" | "last" }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const stats = useMemo(() => {
    // Status efetivo de cada simulação (override local OU status da proposta vinculada)
    const statusBySimId = new Map<string, string>();
    for (const p of proposals) {
      const simId = (p as any).simulation_id as string | undefined;
      if (simId) statusBySimId.set(simId, p.status);
    }
    const statusOf = (s: NegotiationsSimulation) =>
      statusBySimId.get(s.id) || getSimulationStatus(s);

    // VGV: soma EXCLUSIVAMENTE property_value das simulações ativas (sem duplicar)
    const vgv = simulations
      .filter(s => {
        const st = statusOf(s);
        return st !== "lost" && st !== "archived";
      })
      .reduce((acc, curr) => acc + (Number(curr.property_value) || 0), 0);

    // Ciclo médio (fechados) e conversão a partir de allEntries
    let closedCount = 0;
    let cycleSum = 0;
    let cycleN = 0;
    let activeLeads = 0;
    for (const p of allEntries) {
      const status = p.status;
      if (status === "lost" || status === "archived") continue;
      if (status === "closed") {
        closedCount++;
        activeLeads++;
        const startMs = new Date(p.created_at).getTime();
        const endMs = new Date(p.ultima_interacao || p.created_at).getTime();
        const days = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)));
        cycleSum += days;
        cycleN++;
      } else if (status === "potential" || status === "negotiating") {
        activeLeads++;
      }
    }

    return {
      vgv,
      avgCycle: cycleN > 0 ? Math.round(cycleSum / cycleN) : null,
      conversion: activeLeads > 0 ? Math.round((closedCount / activeLeads) * 100) : null,
      hasData: allEntries.length > 0 || simulations.length > 0,
    };
  }, [allEntries, simulations, proposals]);

  const miniDashboard = (
    <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
      {!stats.hasData ? (
        <div className="col-span-full rounded-lg border bg-white px-3 py-3 text-center text-xs text-muted-foreground">
          Aguardando dados para análise
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white px-3 py-2.5 flex items-center gap-2.5">
            <div className="rounded-md bg-[#0b3d7f]/10 p-1.5 shrink-0">
              <TrendingUp className="h-4 w-4 text-[#0b3d7f]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none flex items-center gap-1">
                VGV em Negociação
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#0b1f3d] text-white border-[#0b1f3d]">Soma de imóveis nos status Potencial, Negociando e Fechado.</TooltipContent>
                </Tooltip>
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5 truncate">{formatCurrency(stats.vgv)}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-white px-3 py-2.5 flex items-center gap-2.5">
            <div className="rounded-md bg-[#0b3d7f]/10 p-1.5 shrink-0">
              <Clock className="h-4 w-4 text-[#0b3d7f]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none flex items-center gap-1">
                Ciclo Médio
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#0b1f3d] text-white border-[#0b1f3d]">Média de dias do 1º contato até o fechamento.</TooltipContent>
                </Tooltip>
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {stats.avgCycle !== null ? `${stats.avgCycle} dias` : "—"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-white px-3 py-2.5 flex items-center gap-2.5">
            <div className="rounded-md bg-[#0b3d7f]/10 p-1.5 shrink-0">
              <Target className="h-4 w-4 text-[#0b3d7f]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none flex items-center gap-1">
                Conversão
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#0b1f3d] text-white border-[#0b1f3d]">Percentual de imóveis fechados sobre o total de leads ativos.</TooltipContent>
                </Tooltip>
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {stats.conversion !== null ? `${stats.conversion}%` : "—"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (loadingData) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const searchBar = (
    <div className="mb-2 relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar por cliente, imóvel, valor ou tipo..."
        className="h-9 pl-8 pr-8 text-xs"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (clientGroups.length === 0) {
    return (
      <>
        {miniDashboard}
        {searchBar}
        <div className="text-center py-6">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `Nenhum resultado para "${searchQuery}".`
              : statusFilter
                ? `Nenhuma negociação com status "${STATUS_LABELS[statusFilter]}".`
                : "Nenhuma negociação registrada ainda."}
          </p>
          {searchQuery ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
              Limpar busca
            </Button>
          ) : statusFilter ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setStatusFilter(null)}>
              Limpar filtro
            </Button>
          ) : (
            <Button variant="hero" size="sm" className="mt-3" asChild>
              <Link to="/calculadora">Iniciar primeira negociação</Link>
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {miniDashboard}
      {searchBar}
      {statusFilter && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs">
          <span className="text-muted-foreground">Filtrando por:</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {STATUS_LABELS[statusFilter] ?? statusFilter}
          </Badge>
          <span className="text-muted-foreground">
            · {clientGroups.length} cliente{clientGroups.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setStatusFilter(null)}
          >
            Limpar
          </Button>
        </div>
      )}
      {/* Sortable header */}
      <div className="mb-1.5 flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
        <button
          onClick={() => handleSort("first")}
          className="hidden md:inline-flex items-center gap-1 w-[72px] shrink-0 hover:text-foreground transition-colors"
        >
          1º Contato <SortIcon col="first" />
        </button>
        <button
          onClick={() => handleSort("client")}
          className="flex-1 inline-flex items-center gap-1 hover:text-foreground transition-colors text-left"
        >
          Cliente <SortIcon col="client" />
        </button>
        <button
          onClick={() => handleSort("last")}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Último Contato <SortIcon col="last" />
        </button>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {clientGroups.map((g) => {
          const hasOthers = g.others.length > 0;
          const isExpanded = expandedClients.has(g.client);
          return (
            <div key={g.client} className="space-y-1.5">
              <ProposalRow
                p={g.primary}
                formatDateShort={formatDateShort}
                isPrimary
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMessage={(p) => setMsgModal(p)}
                onContactToday={(p) => setConfirmContact(p)}
                onCopy={handleCopy}
                onChangeStatus={handleChangeStatus}
                activeStatusFilter={statusFilter}
              />
              {hasOthers && (
                <Collapsible open={isExpanded} onOpenChange={() => toggleClient(g.client)}>
                  <CollapsibleTrigger asChild>
                    <button className="ml-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                      />
                      + {g.others.length} proposta{g.others.length !== 1 ? "s" : ""} de {g.client}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 mt-1.5 space-y-1.5 border-l-2 border-border/40 pl-2">
                      {g.others.map((p) => (
                        <ProposalRow
                          key={p.id}
                          p={p}
                          formatDateShort={formatDateShort}
                          isPrimary={false}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMessage={(pp) => setMsgModal(pp)}
                          onContactToday={(pp) => setConfirmContact(pp)}
                          onCopy={handleCopy}
                          onChangeStatus={handleChangeStatus}
                          activeStatusFilter={statusFilter}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Message Templates Modal ─── */}
      <Dialog open={!!msgModal} onOpenChange={(open) => !open && setMsgModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Ativar Cliente — {msgModal?.client_name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha um template, copie e envie. O follow-up será registrado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {msgModal &&
              getTemplates(
                msgModal.client_name,
                extractPropertyValue(msgModal.proposal_text)
              ).map((tpl) => (
                <div key={tpl.label} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{tpl.label}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => handleCopyTemplate(tpl.text, msgModal)}
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed">{tpl.text}</p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Manual Contact ─── */}
      <AlertDialog open={!!confirmContact} onOpenChange={(open) => !open && setConfirmContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Registrar contato</AlertDialogTitle>
            <AlertDialogDescription>
              Registrar contato de hoje com <strong>{confirmContact?.client_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmContact) registerContact(confirmContact);
                setConfirmContact(null);
              }}
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
