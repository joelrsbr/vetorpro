import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { Building2, Palette, User, Upload, RotateCcw, Info, AlertTriangle, MessageCircle, AtSign, Briefcase, Send, Loader2 } from "lucide-react";
const Instagram = AtSign;
const Linkedin = Briefcase;
const Twitter = Send;
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const colorPresets = [
  { name: "Azul Corporativo", primary: "224 76% 30%", accent: "217 91% 60%" },
  { name: "Verde Profissional", primary: "142 76% 26%", accent: "142 70% 45%" },
  { name: "Vermelho Executivo", primary: "0 72% 40%", accent: "0 84% 60%" },
  { name: "Roxo Premium", primary: "271 76% 35%", accent: "271 91% 60%" },
  { name: "Laranja Dinâmico", primary: "25 95% 45%", accent: "38 92% 50%" },
  { name: "Cinza Elegante", primary: "220 13% 30%", accent: "220 20% 50%" },
];

// ----- Color helpers: HSL string ("H S% L%") <-> hex -----
function hslStringToHex(hslStr: string): string {
  const m = (hslStr || "").trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return "#1e3a8a";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHslString(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BusinessCustomization() {
  const { settings, updateSettings, resetSettings, isCustomized } = useBusiness();
  const [logoPreview, setLogoPreview] = useState(settings.companyLogo);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Profile-backed fields (single source of truth for the PDF)
  const [companyName, setCompanyName] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [creci, setCreci] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setCompanyName(p.company || "");
    setConsultantName(p.full_name || "");
    setCreci(p.creci || "");
    setWhatsapp(p.whatsapp || "");
    setInstagram(p.instagram || "");
    setLinkedin(p.linkedin || "");
    setTwitter(p.twitter || "");
    if (p.logo_url) setLogoPreview(p.logo_url);
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem (PNG ou JPG).", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("business-logos").getPublicUrl(filePath);
      const newLogoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      setLogoPreview(newLogoUrl);
      updateSettings({ companyLogo: newLogoUrl });
      await supabase.from("profiles").update({ logo_url: newLogoUrl } as any).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Logo enviada!", description: "Sua logo foi salva no seu perfil." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoPreview("");
    updateSettings({ companyLogo: "" });
    if (user) {
      await supabase.from("profiles").update({ logo_url: null } as any).eq("user_id", user.id);
      await refreshProfile();
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase.from("profiles").update({
        company: companyName,
        full_name: consultantName,
        creci,
        whatsapp,
        instagram,
        linkedin,
        twitter,
      } as any).eq("user_id", user.id);
      updateSettings({ companyName, consultantName });
      await refreshProfile();
      toast({ title: "Salvo!", description: "Seus dados foram atualizados e estarão no próximo PDF." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    updateSettings({ primaryColor: preset.primary, accentColor: preset.accent });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Personalização Business
        </CardTitle>
        <CardDescription>
          Esta é a fonte única dos dados que aparecem nos seus PDFs — logo, nome, CRECI e redes sociais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Info */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados da Empresa
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa/Time</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Imobiliária Premium" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultantName">Nome do Consultor</Label>
              <Input id="consultantName" value={consultantName} onChange={(e) => setConsultantName(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="creci">CRECI</Label>
              <Input id="creci" value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="Ex: CRECI 12345-F" />
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Logo da Empresa
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Mais informações">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  Sua identidade visual é sua primeira impressão. Um PDF com logo profissional diferencia você de qualquer concorrente e agrega autoridade à sua proposta — vale cada minuto investido aqui.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>
          <div className="flex items-start gap-4">
            {logoPreview ? (
              <div className="h-16 w-32 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="h-16 w-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-sm shrink-0">
                Sem logo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoUpload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                  <span>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploadingLogo ? "Enviando..." : "Carregar Logo"}
                  </span>
                </Button>
              </Label>
              <input id="logoUpload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
              <p className="text-xs text-muted-foreground">
                PNG ou JPG · Mínimo 300x300px · Máximo 2MB · Fundo transparente recomendado
              </p>
              {logoPreview && (
                <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>Remover</Button>
              )}
            </div>
          </div>
          {!logoPreview && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Sem logo carregada — seu PDF será gerado sem identidade visual. Carregue sua logo para maximizar o impacto das suas propostas.
              </span>
            </div>
          )}
        </div>

        {/* Contatos e Redes Sociais */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Contatos e Redes Sociais
            <span className="text-xs font-normal text-muted-foreground">(opcional — só aparecerão no PDF se preenchidos)</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
              </Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ex: (51) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2 text-sm">
                <Instagram className="h-4 w-4 text-pink-600" /> Instagram
              </Label>
              <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Ex: @seu.usuario" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
              </Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="Ex: linkedin.com/in/seunome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2 text-sm">
                <Twitter className="h-4 w-4 text-sky-500" /> X / Twitter
              </Label>
              <Input id="twitter" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="Ex: @seu.usuario" />
            </div>
          </div>
        </div>

        <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
          {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar Dados do Perfil
        </Button>

        {/* Color Presets */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cores do Tema
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {colorPresets.map((preset) => (
              <Button key={preset.name} variant="outline" size="sm" onClick={() => applyColorPreset(preset)} className="justify-start gap-2">
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: `hsl(${preset.primary})` }} />
                <span className="text-xs truncate">{preset.name}</span>
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-sm">Cor Primária (HSL)</Label>
              <Input id="primaryColor" value={settings.primaryColor} onChange={(e) => updateSettings({ primaryColor: e.target.value })} placeholder="224 76% 30%" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor" className="text-sm">Cor de Destaque (HSL)</Label>
              <Input id="accentColor" value={settings.accentColor} onChange={(e) => updateSettings({ accentColor: e.target.value })} placeholder="217 91% 60%" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Pré-visualização
          </h4>
          <div className="flex items-center gap-4 p-3 bg-background rounded-lg border">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-10 max-w-24 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: `hsl(${settings.primaryColor})` }}>
                {(companyName || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold" style={{ color: `hsl(${settings.primaryColor})` }}>{companyName || "Sua Empresa"}</p>
              {consultantName && <p className="text-sm text-muted-foreground">Consultor: {consultantName}</p>}
              {creci && <p className="text-xs text-muted-foreground">{creci}</p>}
            </div>
          </div>
        </div>

        {isCustomized && (
          <Button variant="outline" onClick={resetSettings} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Configurações Padrão
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
