import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { Building2, Palette, User, Upload, RotateCcw } from "lucide-react";

const colorPresets = [
  { name: "Azul Corporativo", primary: "224 76% 30%", accent: "217 91% 60%" },
  { name: "Verde Profissional", primary: "142 76% 26%", accent: "142 70% 45%" },
  { name: "Vermelho Executivo", primary: "0 72% 40%", accent: "0 84% 60%" },
  { name: "Roxo Premium", primary: "271 76% 35%", accent: "271 91% 60%" },
  { name: "Laranja Dinâmico", primary: "25 95% 45%", accent: "38 92% 50%" },
  { name: "Cinza Elegante", primary: "220 13% 30%", accent: "220 20% 50%" },
];

export function BusinessCustomization() {
  const { settings, updateSettings, resetSettings, isCustomized } = useBusiness();
  const [logoPreview, setLogoPreview] = useState(settings.companyLogo);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        updateSettings({ companyLogo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    updateSettings({
      primaryColor: preset.primary,
      accentColor: preset.accent,
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Personalização Business
        </CardTitle>
        <CardDescription>
          Invista um tempo e configure sua identidade visual. Esse refino amplia sua percepção de valor e destaca suas propostas.
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
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => updateSettings({ companyName: e.target.value })}
                placeholder="Ex: Imobiliária Premium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultantName">Nome do Consultor</Label>
              <Input
                id="consultantName"
                value={settings.consultantName}
                onChange={(e) => updateSettings({ consultantName: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Logo da Empresa
          </h4>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="h-16 w-32 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                <img 
                  src={logoPreview} 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 w-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-sm">
                Sem logo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoUpload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Carregar Logo
                  </span>
                </Button>
              </Label>
              <input
                id="logoUpload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {logoPreview && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setLogoPreview("");
                    updateSettings({ companyLogo: "" });
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Color Presets */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cores do Tema
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {colorPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyColorPreset(preset)}
                className="justify-start gap-2"
              >
                <div 
                  className="h-4 w-4 rounded-full border"
                  style={{ backgroundColor: `hsl(${preset.primary})` }}
                />
                <span className="text-xs truncate">{preset.name}</span>
              </Button>
            ))}
          </div>
          
          {/* Custom Color Inputs */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-sm">Cor Primária (HSL)</Label>
              <Input
                id="primaryColor"
                value={settings.primaryColor}
                onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                placeholder="224 76% 30%"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor" className="text-sm">Cor de Destaque (HSL)</Label>
              <Input
                id="accentColor"
                value={settings.accentColor}
                onChange={(e) => updateSettings({ accentColor: e.target.value })}
                placeholder="217 91% 60%"
              />
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
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: `hsl(${settings.primaryColor})` }}
              >
                {settings.companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold" style={{ color: `hsl(${settings.primaryColor})` }}>
                {settings.companyName}
              </p>
              {settings.consultantName && (
                <p className="text-sm text-muted-foreground">
                  Consultor: {settings.consultantName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reset Button */}
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
