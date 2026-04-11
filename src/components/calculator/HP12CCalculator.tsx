import { useState, useCallback } from "react";
import { Info, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   HP 12C — Pixel-perfect reproduction from Estácio reference
   https://simulado.estacio.br/img/Hp/
   ═══════════════════════════════════════════════════════════ */

type FinancialValues = { n: number; i: number; pv: number; pmt: number; fv: number };

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

/* ─── Glossary Modal ─── */
function GlossaryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#444] rounded-lg p-5 max-w-[420px] w-full max-h-[80vh] overflow-y-auto text-xs space-y-2 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
        <p className="font-bold text-amber-300 text-sm mb-3">📖 Glossário HP 12C</p>
        <div className="space-y-1.5 text-amber-200/80">
          <p><strong className="text-amber-300">n</strong> — Número de períodos (meses)</p>
          <p><strong className="text-amber-300">i</strong> — Taxa de juros por período (%)</p>
          <p><strong className="text-amber-300">PV</strong> — Valor Presente (empréstimo)</p>
          <p><strong className="text-amber-300">PMT</strong> — Pagamento periódico (parcela)</p>
          <p><strong className="text-amber-300">FV</strong> — Valor Futuro (saldo final)</p>
          <p><strong className="text-amber-300">CHS</strong> — Troca o sinal (+/−)</p>
          <p><strong className="text-amber-300">ENTER</strong> — Confirma entrada (empilha)</p>
          <p><strong className="text-amber-300">RCL</strong> — Recuperar valor armazenado</p>
          <p><strong className="text-amber-300">STO</strong> — Armazenar valor</p>
          <p><strong className="text-amber-300">CLx</strong> — Limpar registrador</p>
          <p><strong className="text-amber-300">f / g</strong> — Funções secundárias (laranja / azul)</p>
        </div>
        <p className="pt-2 border-t border-[#444] text-amber-400/60 text-[10px] mt-3">
          <strong>Dica:</strong> Digite o valor → pressione a tecla da variável para armazenar. Para resolver, armazene todas as variáveis conhecidas e pressione a variável desconhecida.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — Exact reproduction of Estácio HP 12C image
   ═══════════════════════════════════════════════════════════ */

// Button styles matching the reference exactly
const btnBase: React.CSSProperties = {
  width: "42px",
  height: "28px",
  border: "1px solid #555",
  borderRadius: "3px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontWeight: 700,
  fontSize: "12px",
  color: "#e0e0e0",
  position: "relative",
  userSelect: "none" as const,
  transition: "transform 50ms",
  background: "linear-gradient(180deg, #4a4540 0%, #3a3530 40%, #2e2a25 100%)",
  boxShadow: "0 2px 0 #1a1815, inset 0 1px 0 rgba(255,255,255,0.08)",
};

const btnOrange: React.CSSProperties = {
  ...btnBase,
  background: "linear-gradient(180deg, #d4780a 0%, #c06a05 50%, #a85a02 100%)",
  boxShadow: "0 2px 0 #5a3000, inset 0 1px 0 rgba(255,255,255,0.15)",
  color: "#fff",
};

const btnBlue: React.CSSProperties = {
  ...btnBase,
  background: "linear-gradient(180deg, #3a90b8 0%, #2878a0 50%, #1c6088 100%)",
  boxShadow: "0 2px 0 #0c3550, inset 0 1px 0 rgba(255,255,255,0.15)",
  color: "#fff",
};

type BtnProps = {
  label: string;
  fLabel?: string;
  gLabel?: string;
  style?: React.CSSProperties;
  onClick: () => void;
  small?: boolean;
};

function Btn({ label, fLabel, gLabel, style, onClick, small }: BtnProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "42px" }}>
      {/* f-label (orange) */}
      <span style={{
        fontSize: "8px", fontWeight: 700, color: "#d4780a", height: "11px",
        fontFamily: "Arial, sans-serif", whiteSpace: "nowrap", lineHeight: "11px",
        visibility: fLabel ? "visible" : "hidden",
      }}>
        {fLabel || "."}
      </span>
      <button
        onClick={onClick}
        style={{ ...btnBase, ...style, fontSize: small ? "10px" : "12px" }}
        onMouseDown={e => (e.currentTarget.style.transform = "translateY(1px)")}
        onMouseUp={e => (e.currentTarget.style.transform = "none")}
        onMouseLeave={e => (e.currentTarget.style.transform = "none")}
      >
        {label}
      </button>
      {/* g-label (blue) */}
      <span style={{
        fontSize: "7px", fontWeight: 700, color: "#2a90c0", height: "10px",
        fontFamily: "Arial, sans-serif", whiteSpace: "nowrap", lineHeight: "10px",
        visibility: gLabel ? "visible" : "hidden",
      }}>
        {gLabel || "."}
      </span>
    </div>
  );
}

export function HP12CCalculatorBody() {
  const e = useHP12CEngine();
  const [glossary, setGlossary] = useState(false);

  const cellW = 46; // 42px button + 4px gap
  const cols = 10;
  const bodyW = cellW * cols + 16; // +padding

  return (
    <div style={{
      width: `${bodyW + 24}px`,
      margin: "0 auto",
      userSelect: "none",
      position: "relative",
    }}>
      {/* ═══ Beige shell ═══ */}
      <div style={{
        background: "linear-gradient(160deg, #c8bf98 0%, #beb48a 50%, #b0a87a 100%)",
        borderRadius: "8px",
        padding: "12px 12px 6px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
        overflow: "hidden",
      }}>
        {/* ═══ LCD Display ═══ */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "6px", marginBottom: "8px" }}>
          <div style={{
            flex: 1,
            background: "linear-gradient(180deg, #b0b888 0%, #a0a878 50%, #949c6c 100%)",
            border: "1px solid #7a7e56",
            borderRadius: "4px",
            padding: "10px 16px",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.1)",
            textAlign: "right" as const,
          }}>
            <span style={{
              fontFamily: "'Orbitron', 'Courier New', monospace",
              fontSize: "28px",
              fontWeight: 700,
              color: "#1a1e10",
              letterSpacing: "3px",
              lineHeight: 1,
              textShadow: "0 0 1px rgba(0,0,0,0.15)",
            }}>
              {e.display}
            </span>
          </div>

          {/* (i) info button — matches calculator visual language */}
          <button
            onClick={() => setGlossary(true)}
            style={{
              width: "26px",
              background: "linear-gradient(180deg, #b0b888, #a0a878)",
              border: "1px solid #7a7e56",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
            title="Glossário"
          >
            <Info style={{ width: "14px", height: "14px", color: "#3a4020" }} />
          </button>
        </div>

        {/* ═══ Dark body ═══ */}
        <div style={{
          background: "linear-gradient(180deg, #3a3630 0%, #2e2a24 40%, #262220 100%)",
          borderRadius: "5px",
          padding: "6px 8px 8px",
          border: "1px solid #4a4540",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
        }}>
          {/* Financial register readout */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "7px", fontFamily: "monospace", color: "rgba(210,170,80,0.55)",
            padding: "0 2px 4px", lineHeight: 1,
          }}>
            <span>n={e.fin.n.toFixed(0)}</span>
            <span>i={e.fin.i.toFixed(2)}%</span>
            <span>PV={e.fin.pv.toFixed(0)}</span>
            <span>PMT={e.fin.pmt.toFixed(0)}</span>
            <span>FV={e.fin.fv.toFixed(0)}</span>
          </div>

          {/* ══════ ROW 1: n i PV PMT FV CHS 7 8 9 ÷ ══════ */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            <Btn label="n"   fLabel="AMORT" gLabel="12×"  onClick={() => e.storeFin("n")} />
            <Btn label="i"   fLabel="INT"   gLabel="12÷"  onClick={() => e.storeFin("i")} />
            <Btn label="PV"  fLabel="NPV"   gLabel="CFo"  onClick={() => e.storeFin("pv")} />
            <Btn label="PMT" fLabel="RND"   gLabel="CFj"  onClick={() => e.storeFin("pmt")} small />
            <Btn label="FV"  fLabel="IRR"   gLabel="Nj"   onClick={() => e.storeFin("fv")} />
            <Btn label="CHS" fLabel="DATE"                onClick={() => e.op("CHS")} small />
            <Btn label="7"                  gLabel="BEG"  onClick={() => e.num("7")} />
            <Btn label="8"                  gLabel="END"  onClick={() => e.num("8")} />
            <Btn label="9"                  gLabel="MEM"  onClick={() => e.num("9")} />
            <Btn label="÷"                                onClick={() => e.op("÷")} />
          </div>

          {/* ══════ ROW 2: Yˣ 1/x %T Δ% % EEX 4 5 6 × ══════ */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            <Btn label="Yˣ"  fLabel="PRICE" gLabel="√x"   onClick={() => e.op("yˣ")} />
            <Btn label="1/x" fLabel="YTM"   gLabel="eˣ"   onClick={() => e.op("1/x")} small />
            <Btn label="%T"  fLabel="SL"    gLabel="LN"   onClick={() => e.op("%T")} />
            <Btn label="Δ%"  fLabel="SOYD"  gLabel="FRAC" onClick={() => e.op("Δ%")} />
            <Btn label="%"   fLabel="DB"    gLabel="INTG" onClick={() => e.op("%T")} />
            <Btn label="EEX" fLabel="ΔDYS"                onClick={() => e.num("e")} small />
            <Btn label="4"                  gLabel="D.MY" onClick={() => e.num("4")} />
            <Btn label="5"                  gLabel="M.DY" onClick={() => e.num("5")} />
            <Btn label="6"                  gLabel="x̄w"  onClick={() => e.num("6")} />
            <Btn label="×"                                onClick={() => e.op("×")} />
          </div>

          {/* ══════ ROW 3 + 4 with ENTER spanning ══════ */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            {/* Left 5 keys of row 3 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn label="R/S" fLabel="P/R"  gLabel="PSE" onClick={() => {}} small />
                <Btn label="SST" fLabel="Σ"    gLabel="BST" onClick={() => {}} small />
                <Btn label="R↓"  fLabel="PRGM" gLabel="GTO" onClick={() => {}} />
                <Btn label="x⇌y" fLabel="FIN"  gLabel="x≤y" onClick={() => e.swapXY()} small />
                <Btn label="CLx" fLabel="REG"  gLabel="x=0" onClick={e.clx} small />
              </div>
              {/* Row 4: ON f g STO RCL */}
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn label="ON"  onClick={e.clAll} />
                <Btn label="f"   onClick={() => {}} style={btnOrange} />
                <Btn label="g"   onClick={() => {}} style={btnBlue} />
                <Btn label="STO" onClick={() => {}} small />
                <Btn label="RCL" onClick={() => {}} small />
              </div>
            </div>

            {/* ENTER key — spans 2 rows */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "42px" }}>
              <span style={{
                fontSize: "8px", fontWeight: 700, color: "#d4780a", height: "11px",
                fontFamily: "Arial, sans-serif", lineHeight: "11px",
              }}>
                PREFIX
              </span>
              <button
                onClick={e.enter}
                style={{
                  ...btnBase,
                  height: "calc(28px * 2 + 21px)",
                  flexDirection: "column" as const,
                  fontSize: "9px",
                  letterSpacing: "2px",
                  lineHeight: "1.3",
                }}
                onMouseDown={ev => (ev.currentTarget.style.transform = "translateY(1px)")}
                onMouseUp={ev => (ev.currentTarget.style.transform = "none")}
                onMouseLeave={ev => (ev.currentTarget.style.transform = "none")}
              >
                E<br/>N<br/>T<br/>E<br/>R
              </button>
              <span style={{
                fontSize: "7px", fontWeight: 700, color: "#2a90c0", height: "10px",
                fontFamily: "Arial, sans-serif", lineHeight: "10px",
              }}>
                LSTx
              </span>
            </div>

            {/* Right 4 keys of row 3 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn label="1"              gLabel="x̂,r" onClick={() => e.num("1")} />
                <Btn label="2"              gLabel="ŷ,r" onClick={() => e.num("2")} />
                <Btn label="3"              gLabel="n!"  onClick={() => e.num("3")} />
                <Btn label="—"                           onClick={() => e.op("-")} />
              </div>
              {/* Row 4 right: 0 · Σ+ + */}
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn label="0"              gLabel="x̄"  onClick={() => e.num("0")} />
                <Btn label="·"              gLabel="s"   onClick={() => e.num(".")} />
                <Btn label="Σ+"             gLabel="Σ−"  onClick={() => {}} />
                <Btn label="+"                           onClick={() => e.op("+")} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <GlossaryPanel open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}

/* Legacy wrapper */
export function HP12CCalculator() {
  return null;
}
