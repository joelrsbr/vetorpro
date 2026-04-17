import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, Copy, Trash2, ChevronUp, Pencil, MessageSquare, Phone, Mail,
  AlertTriangle, CheckCircle2, FileText, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

/* ─── Types ─── */
export interface CRMProposal {
  id: string;
  client_name: string;
  property_description: string;
  proposal_text: string;
  interest_savings: number | null;
  term_savings_months: number | null;
  created_at: string;
  status: string;
  ultima_interacao?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
}

const STATUS_OPTIONS = [
  { value: "completed", label: "Concluído", color: "text-cyan-400", emoji: "V", isVetor: true },
  { value: "closed", label: "Fechado/Doc", color: "bg-green-500", emoji: "🟢", isVetor: false },
  { value: "potential", label: "Potencial", color: "bg-yellow-500", emoji: "🟡", isVetor: false },
  { value: "archived", label: "Arquivado", color: "bg-red-500", emoji: "🔴", isVetor: false },
];

function getStatusInfo(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
}

/* ─── Follow-up helpers ─── */
function getDaysSince(dateStr: string | null | undefined, fallback: string): number {
  const ref = dateStr || fallback;
  const diff = Date.now() - new Date(ref).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function FollowUpBadge({ days }: { days: number }) {
  if (days >= 7) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5 font-normal">
        🔴 {days}d
      </Badge>
    );
  }
  if (days >= 3) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 gap-0.5 font-normal bg-orange-500 text-white border-orange-500 hover:bg-orange-500">
        <AlertTriangle className="h-2.5 w-2.5" /> {days}d
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] px-1.5 py-0 gap-0.5 font-normal bg-green-600 text-white border-green-600 hover:bg-green-600">
      <CheckCircle2 className="h-2.5 w-2.5" /> Em dia
    </Badge>
  );
}

/* ─── Message templates ─── */
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

function extractPropertyValue(text: string): string {
  // Try to find "R$ X" patterns in proposal text
  const match = text.match(/R\$\s?[\d.,]+/);
  return match ? match[0] : "R$ —";
}

/* ─── Component ─── */
interface ProposalsCRMProps {
  proposals: CRMProposal[];
  setProposals: React.Dispatch<React.SetStateAction<CRMProposal[]>>;
  loadingData: boolean;
  onView: (p: CRMProposal) => void;
  onEdit: (p: CRMProposal) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onCopy: (text: string) => void;
}

export function ProposalsCRM({
  proposals, setProposals, loadingData, onView, onEdit, onDelete, onUpdateStatus, onCopy,
}: ProposalsCRMProps) {
  const { toast } = useToast();
  const [msgModal, setMsgModal] = useState<CRMProposal | null>(null);
  const [confirmContact, setConfirmContact] = useState<CRMProposal | null>(null);

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

  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (loadingData) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-6">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma proposta gerada ainda</p>
        <Button variant="hero" size="sm" className="mt-3" asChild>
          <Link to="/calculadora">Gerar Primeira Proposta</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {proposals.map((proposal) => {
          const statusInfo = getStatusInfo(proposal.status);
          const daysSince = getDaysSince(proposal.ultima_interacao, proposal.created_at);
          const propertyValue = extractPropertyValue(proposal.proposal_text);

          return (
            <div
              key={proposal.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50"
            >
              {/* Status */}
              <div className="shrink-0">
                <Select
                  value={proposal.status}
                  onValueChange={(val) => onUpdateStatus(proposal.id, val)}
                >
                  <SelectTrigger className="w-[110px] h-6 px-1.5 gap-1 text-[11px] border-none bg-transparent shadow-none focus:ring-0">
                    <span className="flex items-center gap-1">
                      {statusInfo.isVetor ? (
                        <ChevronUp className="h-3 w-3 text-cyan-400" strokeWidth={3} />
                      ) : (
                        <span className="text-[10px]">{statusInfo.emoji}</span>
                      )}
                      <span>{statusInfo.label}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="pl-2 text-xs">
                        <span className="flex items-center gap-1.5">
                          {opt.isVetor ? (
                            <ChevronUp className="h-3 w-3 text-cyan-400" strokeWidth={3} />
                          ) : (
                            <span className="text-[10px]">{opt.emoji}</span>
                          )}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client + Date */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{proposal.client_name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">{proposal.property_description}</p>
                  <span className="text-[9px] text-muted-foreground/60">•</span>
                  <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">
                    {formatDateShort(proposal.created_at)}
                  </span>
                </div>
              </div>

              {/* Follow-up badge + manual check */}
              <div className="shrink-0 flex items-center gap-0.5">
                <FollowUpBadge days={daysSince} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-green-600"
                      onClick={() => setConfirmContact(proposal)}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Falei com ele hoje</TooltipContent>
                </Tooltip>
              </div>

              {/* Quick contact actions */}
              <div className="shrink-0 flex items-center gap-0">
                {proposal.client_phone && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700"
                        asChild
                      >
                        <a
                          href={`https://wa.me/${proposal.client_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                )}
                {proposal.client_email && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-500 hover:text-blue-600"
                        asChild
                      >
                        <a href={`mailto:${proposal.client_email}`}>
                          <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>E-mail</TooltipContent>
                  </Tooltip>
                )}

                {/* Generate Message */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => setMsgModal(proposal)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ative seu Cliente: escolha uma abordagem e envie agora.</TooltipContent>
                </Tooltip>
              </div>

              {/* Existing actions */}
              <div className="flex items-center shrink-0 gap-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { onEdit(proposal); }}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onView(proposal)}>
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onCopy(proposal.proposal_text)}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(proposal.id)}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
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
