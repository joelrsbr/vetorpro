import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Lock, Crown, Image as ImageIcon, ExternalLink, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

interface ReportConfigurationProps {
  onConfigChange: (config: ReportConfig) => void;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
}

export interface ReportConfig {
  logoUrl: string | null;
  companyName: string;
  consultantName: string;
  creci: string;
  socials: SocialLinks;
  /** Plan tier flags */
  isBusiness: boolean;
  isPro: boolean;
  isBasic: boolean;
}

export function ReportConfiguration({ onConfigChange }: ReportConfigurationProps) {
  const { user, profile } = useAuth();
  const { plan, isActive } = useSubscription();

  const isBusiness = plan === "business" && isActive;
  const isPro = plan === "pro" && isActive;
  const isBasic = !isBusiness && !isPro;

  // Manual fields for BASIC plan (not persisted — just used in PDF)
  const [basicName, setBasicName] = useState("");
  const [basicCreci, setBasicCreci] = useState("");

  useEffect(() => {
    const p = (profile || {}) as any;
    const fromProfile = {
      logoUrl: isBasic ? null : (p.logo_url || null),
      companyName: p.company || "",
      consultantName: isBasic ? basicName : (p.full_name || ""),
      creci: isBasic ? basicCreci : (p.creci || ""),
      socials: isBusiness
        ? {
            whatsapp: p.whatsapp || "",
            instagram: p.instagram || "",
            linkedin: p.linkedin || "",
            twitter: p.twitter || "",
          }
        : {},
      isBusiness,
      isPro,
      isBasic,
    };
    onConfigChange(fromProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isBusiness, isPro, isBasic, basicName, basicCreci]);

  if (!user) return null;

  // BASIC: P&B + apenas nome/CRECI digitados
  if (isBasic) {
    return (
      <Card className="shadow-card border-muted">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Configuração do Relatório
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              <Lock className="h-3 w-3 mr-1" /> Plano Básico — PDF Preto e Branco
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="basicName">Seu Nome</Label>
            <Input
              id="basicName"
              value={basicName}
              onChange={(e) => setBasicName(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="basicCreci">CRECI</Label>
            <Input
              id="basicCreci"
              value={basicCreci}
              onChange={(e) => setBasicCreci(e.target.value)}
              placeholder="Ex: CRECI 12345-F"
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-center space-y-3">
            <Sparkles className="h-6 w-6 mx-auto text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
              Evolua para o Business e impacte seus clientes com a sua marca.
            </p>
            <Button asChild size="sm" variant="hero">
              <Link to="/precos">
                <Crown className="h-4 w-4 mr-1" /> Ver Planos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PRO/BUSINESS: read-only summary card pulling from profile
  const p = (profile || {}) as any;
  const logoUrl: string | null = p.logo_url || null;
  const companyName: string = p.company || "";
  const consultantName: string = p.full_name || "";
  const creci: string = p.creci || "";

  const socialItems = isBusiness
    ? [
        ["WhatsApp", p.whatsapp],
        ["Instagram", p.instagram],
        ["LinkedIn", p.linkedin],
        ["X/Twitter", p.twitter],
      ].filter(([, v]) => !!v) as [string, string][]
    : [];

  const missingCore = !companyName || !creci || (isBusiness && !logoUrl);

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Configuração do Relatório
          </div>
          {isBusiness ? (
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Crown className="h-3 w-3 mr-1" /> Business
            </Badge>
          ) : (
            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <Crown className="h-3 w-3 mr-1" /> Pro
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg border bg-background flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl && isBusiness ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{companyName || <span className="text-muted-foreground italic">Sem nome cadastrado</span>}</p>
              <p className="text-sm text-muted-foreground truncate">{consultantName || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{creci || "Sem CRECI cadastrado"}</p>
            </div>
          </div>

          {isBusiness && socialItems.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Contatos no PDF:</p>
              <div className="flex flex-wrap gap-1.5">
                {socialItems.map(([label, val]) => (
                  <Badge key={label} variant="secondary" className="text-xs font-normal">
                    {label}: {val}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {missingCore && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Alguns campos estão em branco — preencha em Personalização para um PDF completo.
            </p>
          )}
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/personalizacao" className="flex items-center justify-center gap-1">
            Editar em Personalização Business <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {isPro && (
          <p className="text-xs text-muted-foreground text-center">
            Seu plano Pro inclui logo e nome no PDF. Cenário de mercado e IA estratégica são exclusivos do Business.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
