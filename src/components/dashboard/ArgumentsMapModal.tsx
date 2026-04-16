import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield,
  TrendingUp,
  ChevronDown,
  ExternalLink,
  Info,
  Copy,
  Check,
} from "lucide-react";
import {
  CATEGORIES,
  ARGUMENT_SECTIONS,
  CROSS_ARGUMENT,
  CROSS_ARGUMENT_PROTECTION,
  OFFICIAL_SOURCES,
  SCENARIO_THRESHOLDS,
  SCENARIO_METHODOLOGY,
  SOURCES_DISCLAIMER,
  type IndicatorCategory,
} from "@/lib/market-sources";

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
}

interface ArgumentsMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryPoint[];
}

/* ─── Scenario detection ─── */

type Scenario = "opportunity" | "protection";

function detectScenario(history: HistoryPoint[]): { scenario: Scenario; triggers: string[] } {
  const triggers: string[] = [];

  // IPCA > 4.5%
  const ipcaPts = history.filter(h => h.key === "rate_ipca").sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const lastIpca = ipcaPts.length > 0 ? ipcaPts[ipcaPts.length - 1].value : null;
  if (lastIpca !== null && lastIpca > SCENARIO_THRESHOLDS.ipca_ceiling) {
    triggers.push(`IPCA em ${lastIpca.toFixed(2)}% (acima de ${SCENARIO_THRESHOLDS.ipca_ceiling}%)`);
  }

  // INCC above 12m average + 0.3pp
  const inccPts = history.filter(h => h.key === "index_incc").sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (inccPts.length >= 2) {
    const lastIncc = inccPts[inccPts.length - 1].value;
    const avg = inccPts.reduce((s, p) => s + p.value, 0) / inccPts.length;
    if (lastIncc > avg + SCENARIO_THRESHOLDS.incc_deviation_pp) {
      triggers.push(`INCC-DI em ${lastIncc.toFixed(2)}% (média 12m: ${avg.toFixed(2)}%)`);
    }
  }

  // USD > 2 std deviations (last 30 days)
  const usdPts = history.filter(h => h.key === "currency_usd").sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  if (usdPts.length >= 3) {
    const values = usdPts.map(p => p.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const lastUsd = values[values.length - 1];
    if (std > 0 && Math.abs(lastUsd - mean) > SCENARIO_THRESHOLDS.usd_std_deviations * std) {
      triggers.push(`Dólar com variação > 2 desvios padrão`);
    }
  }

  return {
    scenario: triggers.length > 0 ? "protection" : "opportunity",
    triggers,
  };
}

/* ─── Small source info tooltip ─── */

function SourceInfo({ indicatorKey }: { indicatorKey: string }) {
  const source = OFFICIAL_SOURCES[indicatorKey];
  if (!source) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors ml-1">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-xs space-y-1">
        <p className="font-semibold">{source.officialName}</p>
        <p className="text-muted-foreground">{source.organization}</p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          Fonte oficial <ExternalLink className="h-3 w-3" />
        </a>
      </TooltipContent>
    </Tooltip>
  );
}

/* ─── Copy button ─── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

/* ─── Main Modal ─── */

export function ArgumentsMapModal({ open, onOpenChange, history }: ArgumentsMapModalProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const { scenario, triggers } = useMemo(() => detectScenario(history), [history]);
  const isProtection = scenario === "protection";

  const categoryStyle: Record<IndicatorCategory, string> = {
    inflation: "border-orange-300 bg-orange-50/60 dark:border-orange-800/40 dark:bg-orange-950/20",
    fixed_income: "border-green-300 bg-green-50/60 dark:border-green-800/40 dark:bg-green-950/20",
    variable: "border-blue-300 bg-blue-50/60 dark:border-blue-800/40 dark:bg-blue-950/20",
  };

  const categoryBorder: Record<IndicatorCategory, string> = {
    inflation: "border-l-orange-500",
    fixed_income: "border-l-green-600",
    variable: "border-l-blue-500",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🗺️ Mapa de Argumentos VetorPro
          </DialogTitle>
          <DialogDescription>
            Argumentos de venda embasados em dados oficiais para cada cenário de mercado.
          </DialogDescription>
        </DialogHeader>

        {/* Scenario indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          isProtection
            ? "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
            : "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
        }`}>
          {isProtection ? (
            <Shield className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span>
            Cenário: {isProtection ? "Proteção de Patrimônio" : "Oportunidade"}
          </span>
          {isProtection && (
            <Badge variant="outline" className="text-[10px] ml-auto border-orange-400 text-orange-700 dark:text-orange-300">
              {triggers.length} gatilho{triggers.length > 1 ? "s" : ""} ativo{triggers.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Triggers detail */}
        {isProtection && triggers.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 px-3">
            {triggers.map((t, i) => (
              <p key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                {t}
              </p>
            ))}
          </div>
        )}

        {/* Argument sections */}
        <div className="space-y-4 mt-2">
          {ARGUMENT_SECTIONS.map(section => {
            const cat = CATEGORIES[section.category];
            const phrase = isProtection ? section.protectionPhrase : section.salesPhrase;

            return (
              <div
                key={section.category}
                className={`rounded-lg border border-l-4 p-4 space-y-3 ${categoryStyle[section.category]} ${categoryBorder[section.category]}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <h3 className="font-semibold text-sm">{section.title}</h3>
                  <div className="flex items-center gap-1 ml-auto">
                    {section.indicators.map(key => (
                      <SourceInfo key={key} indicatorKey={key} />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.explanation}
                </p>

                <div className="bg-background/60 rounded-md p-3 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        {isProtection ? "Argumento de Proteção" : "Frase de Venda Sugerida"}
                      </p>
                      <p className="text-sm italic leading-relaxed">"{phrase}"</p>
                    </div>
                    <CopyButton text={phrase} />
                  </div>
                </div>

                {/* Indicators list */}
                <div className="flex flex-wrap gap-1.5">
                  {section.indicators.map(key => {
                    const src = OFFICIAL_SOURCES[key];
                    return (
                      <span key={key} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
                        {src?.officialName?.split(" ")[0] || key}
                        <SourceInfo indicatorKey={key} />
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cross-argument */}
        <div className="rounded-lg border-2 border-dashed border-muted p-4 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            🔀 Cruzamento de Cores — Argumento Combinado
          </h3>
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            "{isProtection ? CROSS_ARGUMENT_PROTECTION : CROSS_ARGUMENT}"
          </p>
          <CopyButton text={isProtection ? CROSS_ARGUMENT_PROTECTION : CROSS_ARGUMENT} />
        </div>

        {/* Sources & Methodology */}
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-xs text-muted-foreground h-8">
              Fontes e Metodologia
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Source list */}
            <div className="grid gap-1.5">
              {Object.entries(OFFICIAL_SOURCES).map(([key, src]) => (
                <div key={key} className="flex items-center justify-between text-xs text-muted-foreground px-2 py-1 rounded bg-muted/30">
                  <span className="font-medium">{src.officialName}</span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-accent hover:underline shrink-0"
                  >
                    {src.organization} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* Scenario triggers methodology */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Gatilhos de Cenário de Proteção:</p>
              {SCENARIO_METHODOLOGY.map(item => (
                <div key={item.label} className="text-xs text-muted-foreground pl-3 border-l-2 border-orange-300">
                  <p className="font-medium">{item.label}</p>
                  <p>{item.description}</p>
                  <p className="text-[10px] italic">{item.source}</p>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-muted-foreground italic leading-relaxed pt-2 border-t border-border/50">
              {SOURCES_DISCLAIMER}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
