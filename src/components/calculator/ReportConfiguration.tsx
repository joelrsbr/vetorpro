import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Upload, Lock, Crown, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_PLANS } from "@/lib/stripe-plans";

interface ReportConfigurationProps {
  onConfigChange: (config: ReportConfig) => void;
}

export interface ReportConfig {
  logoUrl: string | null;
  companyName: string;
  creci: string;
  isBusiness: boolean;
}

export function ReportConfiguration({ onConfigChange }: ReportConfigurationProps) {
  const { user, profile } = useAuth();
  const { plan, isActive } = useSubscription();
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [creci, setCreci] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRedirectingPro, setIsRedirectingPro] = useState(false);
  const [isRedirectingBusiness, setIsRedirectingBusiness] = useState(false);

  const isBusiness = plan === "business" && isActive;
  const isPro = plan === "pro" && isActive;
  const canEditProfile = isBusiness || isPro;

  const handleUpgradeBusiness = async () => {
    if (!user) return;
    setIsRedirectingBusiness(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS.business.priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setIsRedirectingBusiness(false);
    }
  };

  // Load saved values from profile
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company || "");
      setCreci((profile as any).creci || "");
      setLogoUrl((profile as any).logo_url || null);
    }
  }, [profile]);

  // Notify parent of config changes
  useEffect(() => {
    onConfigChange({ logoUrl, companyName, creci, isBusiness });
  }, [logoUrl, companyName, creci, isBusiness]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato inválido",
        description: "Selecione uma imagem (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/logo.${file.name.split(".").pop()}`;

      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(filePath);

      const newLogoUrl = publicUrlData.publicUrl;
      setLogoUrl(newLogoUrl);

      // Save to profile
      await supabase
        .from("profiles")
        .update({ logo_url: newLogoUrl } as any)
        .eq("user_id", user.id);

      toast({ title: "Logo enviada!", description: "Sua logo foi salva com sucesso." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ company: companyName, creci } as any)
      .eq("user_id", user.id);

    toast({ title: "Salvo!", description: "Informações da empresa atualizadas." });
  };

  const handleUpgradePro = async () => {
    if (!user) return;
    setIsRedirectingPro(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS.pro.priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setIsRedirectingPro(false);
    }
  };

  if (!user) return null;

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
              <Crown className="h-3 w-3 mr-1" />
              Business
            </Badge>
          ) : isPro ? (
            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <Crown className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <Lock className="h-3 w-3 mr-1" />
              Exclusivo Pro / Business
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label className={!isBusiness ? "text-muted-foreground" : ""}>
            Logo da Imobiliária {!isBusiness && <span className="text-xs text-muted-foreground">(Exclusivo Business)</span>}
          </Label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoUrl && isBusiness ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1">
              {isBusiness ? (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      {uploading ? "Enviando..." : "Enviar Logo"}
                    </span>
                  </Button>
                </label>
              ) : (
              <div className="space-y-2">
                <Button variant="outline" size="sm" disabled className="opacity-50">
                  <Lock className="h-4 w-4 mr-1" />
                  Enviar Logo
                </Button>
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isRedirectingBusiness}
                  onClick={handleUpgradeBusiness}
                >
                  {isRedirectingBusiness ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4 mr-1" />
                  )}
                  Migrar para Business
                </Button>
              </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">PNG ou JPG, máx. 2MB</p>
            </div>
          </div>
        </div>

        {/* Company Name / Nome Profissional */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className={!canEditProfile ? "text-muted-foreground" : ""}>
            {isPro ? "Nome Profissional" : "Nome da Imobiliária"}
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={isPro ? "João da Silva — Corretor" : "Imobiliária Exemplo LTDA"}
            disabled={!canEditProfile}
            className={!canEditProfile ? "opacity-50" : ""}
          />
        </div>

        {/* CRECI */}
        <div className="space-y-2">
          <Label htmlFor="creci" className={!canEditProfile ? "text-muted-foreground" : ""}>
            CRECI
          </Label>
          <Input
            id="creci"
            value={creci}
            onChange={(e) => setCreci(e.target.value)}
            placeholder="CRECI 12345-F"
            disabled={!canEditProfile}
            className={!canEditProfile ? "opacity-50" : ""}
          />
        </div>

        {canEditProfile ? (
          <div className="space-y-2">
            <Button variant="default" size="sm" onClick={handleSaveCompanyInfo} className="w-full">
              Salvar Informações
            </Button>
            {isPro && (
              <p className="text-xs text-muted-foreground text-center">
                Seu nome e CRECI aparecerão no rodapé do PDF gerado.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
            <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              Personalize seus relatórios com seu nome e CRECI.
              Disponível a partir do <strong>Plano Pro</strong>.
            </p>
            <Button
              variant="hero"
              size="sm"
              disabled={isRedirectingPro}
              onClick={handleUpgradePro}
            >
              {isRedirectingPro ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-1" />
              )}
              Fazer Upgrade para Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
