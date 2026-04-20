import { useMemo, useState } from "react";
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
  FileText, Eye, Pencil, Trash2, Loader2, Phone, Mail, MessageSquare,
  ChevronDown, CheckCircle2, Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CRMProposal } from "./ProposalsCRM";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

/* ─── helpers ─── */
function getDaysSince(dateStr: string | null | undefined, fallback: string): number {
  const ref = dateStr || fallback;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

function CombinedFollowUpBadge({
  status,
  days,
  onClick,
  isActive,
}: {
  status: string;
  days: number;
  onClick?: (status: string) => void;
  isActive?: boolean;
}) {
  const clickable = !!onClick;
  const baseInteractive = clickable
    ? `cursor-pointer transition-all hover:scale-105 ${isActive ? "ring-2 ring-offset-1 ring-primary" : ""}`
    : "";

  const handle = (e: React.MouseEvent) => {
    if (!onClick) return;
    e.stopPropagation();
    onClick(status);
  };

  if (status === "closed") {
    return (
      <Badge
        onClick={handle}
        className={`text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-100 ${baseInteractive}`}
      >
        🟢 Fechado
      </Badge>
    );
  }
  if (status === "lost") {
    return (
      <Badge
        onClick={handle}
        className={`text-[10px] px-1.5 py-0 bg-red-100 text-red-800 border-red-200 hover:bg-red-100 ${baseInteractive}`}
      >
        🔴 Perdido
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge
        onClick={handle}
        variant="secondary"
        className={`text-[10px] px-1.5 py-0 opacity-70 ${baseInteractive}`}
      >
        ⚪ Arquivado
      </Badge>
    );
  }
  if (status === "potential") {
    const urgent = days > 7;
    return (
      <Badge
        onClick={handle}
        className={`text-[10px] px-1.5 py-0 bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-500 ${baseInteractive} ${
          urgent && !isActive ? "animate-pulse ring-2 ring-yellow-400" : ""
        }`}
      >
        🟡 Potencial · {days}d
      </Badge>
    );
  }
  const urgent = days > 3;
  return (
    <Badge
      onClick={handle}
      className={`text-[10px] px-1.5 py-0 bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-600 ${baseInteractive} ${
        urgent && !isActive ? "animate-pulse ring-2 ring-cyan-400" : ""
      }`}
    >
      🔵 Negociando · {days}d
    </Badge>
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
  activeStatusFilter?: string | null;
}) {
  const days = getDaysSince(p.ultima_interacao, p.created_at);
  return (
    <div
      className={`rounded-lg border p-3 sm:p-2 sm:px-3 ${
        isPrimary ? "bg-muted/30 border-border/50" : "bg-background/40 border-border/40"
      }`}
    >
      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 border-primary/30">
          <FileText className="h-2.5 w-2.5 mr-0.5" /> Proposta
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate">{p.client_name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {p.property_description} · {extractPropertyValue(p.proposal_text)} · {formatDateShort(new Date(p.created_at))}
          </p>
        </div>
        <CombinedFollowUpBadge status={p.status} days={days} />
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
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/5 border-primary/30">
              <FileText className="h-2.5 w-2.5 mr-0.5" /> Proposta
            </Badge>
            <CombinedFollowUpBadge status={p.status} days={days} />
          </div>
          <p className="font-semibold text-sm mt-1 truncate">{p.client_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {p.property_description} · {extractPropertyValue(p.proposal_text)}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateShort(new Date(p.created_at))}</p>
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
    onCopyProposal,
  } = props;
  const { toast } = useToast();
  const [msgModal, setMsgModal] = useState<CRMProposal | null>(null);
  const [confirmContact, setConfirmContact] = useState<CRMProposal | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

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
      toast({ title: "Contato registrado ✅" });
    }
  };

  const handleCopyTemplate = async (text: string, proposal: CRMProposal) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada! 📋" });
    await registerContact(proposal);
    setMsgModal(null);
  };

  /* Group proposals by client; sort each client's proposals newest-first */
  const clientGroups = useMemo(() => {
    const map = new Map<string, CRMProposal[]>();
    for (const p of proposals) {
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
      const oldestInteractionTs = Math.min(
        ...sorted.map(p => new Date(p.ultima_interacao || p.created_at).getTime())
      );
      return { client, primary, others: sorted.slice(1), oldestInteractionTs };
    });
    // Oldest interaction at the TOP — needs more attention first
    return groups.sort((a, b) => a.oldestInteractionTs - b.oldestInteractionTs);
  }, [proposals]);

  const toggleClient = (client: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(client) ? next.delete(client) : next.add(client);
      return next;
    });
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientGroups.length === 0) {
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
    <>
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
                onView={onViewProposal}
                onEdit={onEditProposal}
                onDelete={onDeleteProposal}
                onMessage={(p) => setMsgModal(p)}
                onContactToday={(p) => setConfirmContact(p)}
                onCopy={onCopyProposal}
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
                          onView={onViewProposal}
                          onEdit={onEditProposal}
                          onDelete={onDeleteProposal}
                          onMessage={(pp) => setMsgModal(pp)}
                          onContactToday={(pp) => setConfirmContact(pp)}
                          onCopy={onCopyProposal}
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
