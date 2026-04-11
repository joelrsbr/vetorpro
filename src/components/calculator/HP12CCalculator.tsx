import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Info, X, Calculator } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   HP 12C — Pixel-perfect skeuomorphic recreation
   Reference: https://simulado.estacio.br/img/Hp/
   ═══════════════════════════════════════════════════════════ */

type FinancialValues = {
  n: number;
  i: number;
  pv: number;
  pmt: number;
  fv: number;
};

/* ─── Financial engine (RPN) ─── */
function useHP12CEngine() {
  const [display, setDisplay] = useState("0.00");
  const [stack, setStack] = useState<number[]>([0, 0, 0, 0]);
  const [fin, setFin] = useState<FinancialValues>({ n: 0, i: 0, pv: 0, pmt: 0, fv: 0 });
  const [isNew, setIsNew] = useState(true);

  const push = useCallback((v: number) => {
    setStack((s) => [v, s[0], s[1], s[2]]);
  }, []);

  const num = (d: string) => {
    if (isNew) { setDisplay(d === "." ? "0." : d); setIsNew(false); }
    else { if (d === "." && display.includes(".")) return; setDisplay(display + d); }
  };

  const enter = () => { push(parseFloat(display)); setIsNew(true); };

  const clx = () => { setDisplay("0"); setIsNew(true); };

  const clAll = () => {
    setDisplay("0.00"); setStack([0, 0, 0, 0]);
    setFin({ n: 0, i: 0, pv: 0, pmt: 0, fv: 0 }); setIsNew(true);
  };

  const op = (o: string) => {
    const x = parseFloat(display), y = stack[0];
    let r = 0;
    switch (o) {
      case "+": r = y + x; break;
      case "-": r = y - x; break;
      case "×": r = y * x; break;
      case "÷": r = x !== 0 ? y / x : 0; break;
      case "Δ%": r = x !== 0 ? ((y - x) / x) * 100 : 0; break;
      case "%T": r = y !== 0 ? (x / y) * 100 : 0; break;
      case "yˣ": r = Math.pow(y, x); break;
      case "1/x": r = x !== 0 ? 1 / x : 0; break;
      case "√x": r = Math.sqrt(x); break;
      case "CHS": setDisplay((-x).toString()); return;
    }
    setStack((s) => [s[1], s[2], s[3], x]);
    setDisplay(r.toFixed(6).replace(/\.?0+$/, "")); setIsNew(true);
  };

  const storeFin = (k: keyof FinancialValues) => {
    setFin((p) => ({ ...p, [k]: parseFloat(display) })); enter();
  };

  const swapXY = () => {
    const x = parseFloat(display);
    setDisplay(stack[0].toString());
    setStack((s) => [x, s[1], s[2], s[3]]); setIsNew(true);
  };

  const solve = (k: keyof FinancialValues) => {
    const { n, i, pv, pmt, fv } = fin;
    const r = i / 100;
    let res = 0;
    try {
      switch (k) {
        case "n": if (r !== 0 && pmt !== 0) res = Math.log((pmt - fv * r) / (pmt + pv * r)) / Math.log(1 + r); break;
        case "i": res = ((-pmt * n - fv - pv) / (pv * n)) * 100; break;
        case "pv": if (r !== 0) res = -pmt * (1 - Math.pow(1 + r, -n)) / r - fv * Math.pow(1 + r, -n); break;
        case "pmt": if (r !== 0 && n > 0) { const f = Math.pow(1 + r, n); res = -(pv * r * f) / (f - 1) - (fv * r) / (f - 1); } break;
        case "fv": if (r !== 0) { const f = Math.pow(1 + r, n); res = -pv * f - pmt * (f - 1) / r; } break;
      }
      setFin((p) => ({ ...p, [k]: res }));
      setDisplay(res.toFixed(2)); setIsNew(true);
    } catch { setDisplay("Error"); setIsNew(true); }
  };

  return { display, fin, num, enter, clx, clAll, op, storeFin, swapXY, solve };
}

/* ─── Key component ─── */
const KEY_H = "h-[38px]";

function Key({
  label, onClick, fLabel, gLabel, variant = "dark", wide, tall, className: extra,
}: {
  label: string; onClick: () => void;
  variant?: "dark" | "orange" | "blue";
  fLabel?: string; gLabel?: string; wide?: boolean; tall?: boolean;
  className?: string;
}) {
  const base = cn(
    "relative font-bold select-none transition-all duration-75 border rounded-[4px]",
    "active:translate-y-[2px] active:shadow-none cursor-pointer",
    "flex items-center justify-center text-center leading-tight",
    wide ? "min-w-0" : "min-w-0",
    tall ? "row-span-2" : KEY_H,
  );

  const styles: Record<string, string> = {
    dark: "bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#1e1e1e] text-white/90 border-[#555] shadow-[0_3px_0_#0a0a0a,inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)] hover:from-[#444] hover:via-[#333] hover:to-[#252525]",
    orange: "bg-gradient-to-b from-[#e8860f] via-[#d4760a] to-[#b86208] text-white border-[#aa5e08] shadow-[0_3px_0_#6a3a04,inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:from-[#f09020] hover:via-[#e0860f] hover:to-[#c06e0a]",
    blue: "bg-gradient-to-b from-[#3a8ec8] via-[#2874a6] to-[#1c5a82] text-white border-[#1c5a82] shadow-[0_3px_0_#0e3450,inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:from-[#4599d3] hover:via-[#3085b7] hover:to-[#206690]",
  };

  return (
    <div className={cn("flex flex-col items-center gap-0", wide ? "col-span-2" : "", tall ? "row-span-2" : "", extra)}>
      {/* f-label (orange) */}
      <span className={cn(
        "text-[8px] font-bold leading-none h-[12px] whitespace-nowrap tracking-tight",
        fLabel ? "text-[#e8860f]" : "invisible"
      )}>
        {fLabel || "."}
      </span>
      <button className={cn(base, styles[variant], tall && "h-full")} onClick={onClick}>
        <span className={cn("text-[12px]", label.length > 3 && "text-[10px]")}>{label}</span>
      </button>
      {/* g-label (blue) */}
      <span className={cn(
        "text-[7px] font-bold leading-none h-[11px] whitespace-nowrap tracking-tight",
        gLabel ? "text-[#2a8ec8]" : "invisible"
      )}>
        {gLabel || "."}
      </span>
    </div>
  );
}

/* ─── Glossary Modal ─── */
function GlossaryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
      <div className="bg-[#1a1a1a] border border-amber-700/40 rounded-xl p-4 max-w-[420px] w-full max-h-[90%] overflow-y-auto text-xs space-y-2 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-amber-300 text-sm">📖 Glossário HP 12C</p>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-1.5 text-amber-200/80">
          <p><strong className="text-amber-300">n</strong> — Número de períodos (meses)</p>
          <p><strong className="text-amber-300">i</strong> — Taxa de juros por período (%)</p>
          <p><strong className="text-amber-300">PV</strong> — Valor Presente (empréstimo)</p>
          <p><strong className="text-amber-300">PMT</strong> — Pagamento periódico (parcela)</p>
          <p><strong className="text-amber-300">FV</strong> — Valor Futuro (saldo final)</p>
          <p><strong className="text-amber-300">CHS</strong> — Troca o sinal (+/−)</p>
          <p><strong className="text-amber-300">ENTER</strong> — Empilha o valor no registrador</p>
          <p><strong className="text-amber-300">CLx</strong> — Limpa o visor</p>
          <p><strong className="text-amber-300">ON</strong> — Reinicia todos os registros</p>
          <p><strong className="text-amber-300">x⇌y</strong> — Troca X e Y na pilha</p>
          <p><strong className="text-amber-300">→n / →i / →PV / →PMT / →FV</strong> — Resolve a variável</p>
        </div>
        <p className="pt-2 border-t border-amber-700/30 text-amber-400/70 text-[10px]">
          <strong>Dica:</strong> Digite o valor → pressione a tecla da variável para armazenar → pressione o botão laranja "→" para resolver.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — HP 12C Body (Landscape, skeuomorphic)
   ═══════════════════════════════════════════════════════════ */
export function HP12CCalculatorBody() {
  const e = useHP12CEngine();
  const [glossary, setGlossary] = useState(false);

  return (
    <div className="w-full max-w-[600px] mx-auto select-none relative">
      {/* Outer beige shell — chamfered look */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #d4c89a, #c0b480, #b8a870)",
          padding: "14px 12px 8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.15)",
        }}
      >
        {/* Brand line */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[9px] font-bold text-[#3a3020] tracking-[2px] uppercase opacity-70">HEWLETT · PACKARD</span>
          <span className="text-[10px] font-extrabold text-[#3a3020] tracking-wider">12C</span>
        </div>

        {/* LCD Display */}
        <div className="relative mb-3 flex items-stretch gap-0">
          <div
            className="flex-1 rounded-md px-5 py-3 text-right border"
            style={{
              background: "linear-gradient(180deg, #b8bc8a, #a8ac78, #9ea272)",
              borderColor: "#7a7e56",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <span
              className="block text-[32px] tracking-[4px] leading-none"
              style={{
                fontFamily: "'Orbitron', 'Courier New', monospace",
                fontWeight: 700,
                color: "#1a1e10",
                textShadow: "0 0 1px rgba(0,0,0,0.2)",
              }}
            >
              {e.display}
            </span>
          </div>

          {/* Info button — physical, integrated into the shell to the right of the LCD */}
          <button
            onClick={() => setGlossary(true)}
            className="w-[32px] flex-shrink-0 ml-2 rounded-md border flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{
              background: "linear-gradient(180deg, #b8bc8a, #a8ac78)",
              borderColor: "#7a7e56",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)",
            }}
            title="Glossário"
          >
            <Info className="h-4 w-4 text-[#3a4020]" />
          </button>
        </div>

        {/* Dark body with keys */}
        <div
          className="rounded-lg p-3 pt-2"
          style={{
            background: "linear-gradient(180deg, #3a3630, #2e2a24, #262220)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1)",
            border: "1px solid #4a4640",
          }}
        >
          {/* Financial register readout */}
          <div className="flex justify-between text-[8px] mb-2 px-1 font-mono text-amber-400/70">
            <span>n={e.fin.n.toFixed(0)}</span>
            <span>i={e.fin.i.toFixed(2)}%</span>
            <span>PV={e.fin.pv.toFixed(0)}</span>
            <span>PMT={e.fin.pmt.toFixed(0)}</span>
            <span>FV={e.fin.fv.toFixed(0)}</span>
          </div>

          {/* ══════════════ KEY GRID — 10 cols × 4 rows ══════════════ */}
          <div className="grid grid-cols-10 gap-x-[4px] gap-y-0">

            {/* ─── Row 1: n i PV PMT FV  CHS 7 8 9 ÷ ─── */}
            <Key label="n"   onClick={() => e.storeFin("n")}   fLabel="AMORT" gLabel="12×"  />
            <Key label="i"   onClick={() => e.storeFin("i")}   fLabel="INT"   gLabel="12÷"  />
            <Key label="PV"  onClick={() => e.storeFin("pv")}  fLabel="NPV"   gLabel="CFo"  />
            <Key label="PMT" onClick={() => e.storeFin("pmt")} fLabel="RND"   gLabel="CFj"  />
            <Key label="FV"  onClick={() => e.storeFin("fv")}  fLabel="IRR"   gLabel="Nj"   />
            <Key label="CHS" onClick={() => e.op("CHS")}       fLabel="DATE"                />
            <Key label="7"   onClick={() => e.num("7")}                        gLabel="BEG"  />
            <Key label="8"   onClick={() => e.num("8")}                        gLabel="END"  />
            <Key label="9"   onClick={() => e.num("9")}                        gLabel="MEM"  />
            <Key label="÷"   onClick={() => e.op("÷")}                                      />

            {/* ─── Row 2: yˣ 1/x %T Δ% %  EEX 4 5 6 × ─── */}
            <Key label="yˣ"  onClick={() => e.op("yˣ")}   fLabel="PRICE" gLabel="√x"   />
            <Key label="1/x" onClick={() => e.op("1/x")}  fLabel="YTM"   gLabel="eˣ"   />
            <Key label="%T"  onClick={() => e.op("%T")}    fLabel="SL"    gLabel="LN"   />
            <Key label="Δ%"  onClick={() => e.op("Δ%")}   fLabel="SOYD"  gLabel="FRAC" />
            <Key label="%"   onClick={() => e.op("%T")}    fLabel="DB"    gLabel="INTG" />
            <Key label="EEX" onClick={() => e.num("e")}    fLabel="ΔDYS"                />
            <Key label="4"   onClick={() => e.num("4")}                   gLabel="D.MY" />
            <Key label="5"   onClick={() => e.num("5")}                   gLabel="M.DY" />
            <Key label="6"   onClick={() => e.num("6")}                   gLabel="x̄w"  />
            <Key label="×"   onClick={() => e.op("×")}                                  />

            {/* ─── Row 3: R/S SST R↓ x⇌y CLx  ENTER 1 2 3 − ─── */}
            <Key label="R/S"  onClick={() => {}} fLabel="P/R"  gLabel="PSE" />
            <Key label="SST"  onClick={() => {}} fLabel="Σ"    gLabel="BST" />
            <Key label="R↓"   onClick={() => {}} fLabel="PRGM" gLabel="GTO" />
            <Key label="x⇌y"  onClick={e.swapXY} fLabel="FIN"  gLabel="x≤y" />
            <Key label="CLx"  onClick={e.clx}     fLabel="REG"  gLabel="x=0" />

            {/* ENTER — spans 2 rows (col 6) */}
            <div className="row-span-2 flex flex-col items-center gap-0">
              <span className="text-[8px] font-bold leading-none h-[12px] text-[#e8860f]">PREFIX</span>
              <button
                className={cn(
                  "w-full rounded-[4px] border font-bold select-none transition-all duration-75",
                  "active:translate-y-[2px] active:shadow-none cursor-pointer",
                  "bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#1e1e1e] text-white/90 border-[#555]",
                  "shadow-[0_3px_0_#0a0a0a,inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)]",
                  "hover:from-[#444] hover:via-[#333] hover:to-[#252525]",
                  "flex flex-col items-center justify-center text-[9px] tracking-[3px] leading-[1.4]"
                )}
                style={{ height: "calc(100% - 23px)" }}
                onClick={e.enter}
              >
                E<br/>N<br/>T<br/>E<br/>R
              </button>
              <span className="text-[7px] font-bold leading-none h-[11px] text-[#2a8ec8]">LSTx</span>
            </div>

            <Key label="1" onClick={() => e.num("1")} gLabel="x̂,r" />
            <Key label="2" onClick={() => e.num("2")} gLabel="ŷ,r" />
            <Key label="3" onClick={() => e.num("3")} gLabel="n!"  />
            <Key label="−" onClick={() => e.op("-")}               />

            {/* ─── Row 4: ON f g STO RCL  (enter cont.) 0 · Σ+ + ─── */}
            <Key label="ON"  onClick={e.clAll} />
            <Key label="f"   onClick={() => {}} variant="orange" />
            <Key label="g"   onClick={() => {}} variant="blue"   />
            <Key label="STO" onClick={() => {}} />
            <Key label="RCL" onClick={() => {}} />
            {/* col 6 occupied by ENTER row-span */}

            <Key label="0"  onClick={() => e.num("0")} gLabel="x̄"  />
            <Key label="·"  onClick={() => e.num(".")} gLabel="s"  />
            <Key label="Σ+" onClick={() => {}}          gLabel="Σ−" />
            <Key label="+"  onClick={() => e.op("+")}               />
          </div>

          {/* ═══ Solve row — orange buttons ═══ */}
          <div className="grid grid-cols-5 gap-1 mt-3">
            {(["n", "i", "pv", "pmt", "fv"] as const).map((k) => (
              <button
                key={k}
                className={cn(
                  "rounded-[4px] border font-bold select-none transition-all duration-75",
                  "active:translate-y-[1px] active:shadow-none cursor-pointer",
                  "bg-gradient-to-b from-[#e8860f] via-[#d4760a] to-[#b86208] text-white border-[#aa5e08]",
                  "shadow-[0_2px_0_#6a3a04,inset_0_1px_0_rgba(255,255,255,0.2)]",
                  "hover:from-[#f09020] hover:via-[#e0860f] hover:to-[#c06e0a]",
                  "h-[30px] text-[10px]"
                )}
                onClick={() => e.solve(k)}
              >
                →{k === "pv" ? "PV" : k === "pmt" ? "PMT" : k === "fv" ? "FV" : k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Glossary overlay */}
      <GlossaryPanel open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}

/* Legacy wrapper */
export function HP12CCalculator() {
  return null;
}
