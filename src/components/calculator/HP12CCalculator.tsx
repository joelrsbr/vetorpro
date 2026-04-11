import { useState, useCallback, useEffect } from "react";
import { Info, X } from "lucide-react";

type FinancialValues = { n: number; i: number; pv: number; pmt: number; fv: number };

function useHP12CEngine() {
  const [display, setDisplay] = useState("0.00");
  const [stack, setStack] = useState<number[]>([0, 0, 0, 0]);
  const [fin, setFin] = useState<FinancialValues>({ n: 0, i: 0, pv: 0, pmt: 0, fv: 0 });
  const [isNew, setIsNew] = useState(true);
  const [isOn, setIsOn] = useState(true);
  const push = useCallback((v: number) => { setStack((s) => [v, s[0], s[1], s[2]]); }, []);
  const num = (d: string) => {
    if (!isOn) return;
    if (isNew) { setDisplay(d === "." ? "0." : d); setIsNew(false); }
    else { if (d === "." && display.includes(".")) return; setDisplay(display + d); }
  };
  const enter = () => { push(parseFloat(display)); setIsNew(true); };
  const clx = () => { setDisplay("0"); setIsNew(true); };
  const clAll = () => { setDisplay("0.00"); setStack([0, 0, 0, 0]); setFin({ n: 0, i: 0, pv: 0, pmt: 0, fv: 0 }); setIsNew(true); setIsOn(true); };
  const onKey = () => {
    if (!isOn) { setIsOn(true); setDisplay("0.00"); setIsNew(true); return; }
    num(".");
  };
  const op = (o: string) => {
    if (!isOn) return;
    const x = parseFloat(display), y = stack[0]; let r = 0;
    switch (o) {
      case "+": r = y + x; break; case "-": r = y - x; break;
      case "×": r = y * x; break; case "÷": r = x !== 0 ? y / x : 0; break;
      case "Δ%": r = x !== 0 ? ((y - x) / x) * 100 : 0; break;
      case "%T": r = y !== 0 ? (x / y) * 100 : 0; break;
      case "yˣ": r = Math.pow(y, x); break; case "1/x": r = x !== 0 ? 1 / x : 0; break;
      case "√x": r = Math.sqrt(x); break; case "CHS": setDisplay((-x).toString()); return;
    }
    setStack((s) => [s[1], s[2], s[3], x]); setDisplay(r.toFixed(6).replace(/\.?0+$/, "")); setIsNew(true);
  };
  const storeFin = (k: keyof FinancialValues) => { if (!isOn) return; setFin((p) => ({ ...p, [k]: parseFloat(display) })); enter(); };
  const swapXY = () => { const x = parseFloat(display); setDisplay(stack[0].toString()); setStack((s) => [x, s[1], s[2], s[3]]); setIsNew(true); };
  const solve = (k: keyof FinancialValues) => {
    const { n, i, pv, pmt, fv } = fin; const r = i / 100; let res = 0;
    try {
      switch (k) {
        case "n": if (r !== 0 && pmt !== 0) res = Math.log((pmt - fv * r) / (pmt + pv * r)) / Math.log(1 + r); break;
        case "i": res = ((-pmt * n - fv - pv) / (pv * n)) * 100; break;
        case "pv": if (r !== 0) res = -pmt * (1 - Math.pow(1 + r, -n)) / r - fv * Math.pow(1 + r, -n); break;
        case "pmt": if (r !== 0 && n > 0) { const f = Math.pow(1 + r, n); res = -(pv * r * f) / (f - 1) - (fv * r) / (f - 1); } break;
        case "fv": if (r !== 0) { const f = Math.pow(1 + r, n); res = -pv * f - pmt * (f - 1) / r; } break;
      }
      setFin((p) => ({ ...p, [k]: res })); setDisplay(res.toFixed(2)); setIsNew(true);
    } catch { setDisplay("Error"); setIsNew(true); }
  };
  return { display, fin, isOn, num, enter, clx, clAll, onKey, op, storeFin, swapXY, solve };
}

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
      </div>
    </div>
  );
}

/* ═══ Styles — desaturated, matte, hardware-like ═══ */

const S = {
  btn: {
    width: "42px", height: "27px",
    border: "1px solid #3d3830",
    borderTop: "1px solid #4a4438",
    borderBottom: "1px solid #2a2520",
    borderRadius: "2px",
    cursor: "pointer",
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    fontWeight: 600 as const,
    fontSize: "11px",
    color: "#c8c0b0",
    userSelect: "none" as const,
    background: "#333028",
    boxShadow: "0 1.5px 0 #18150f, inset 0 0.5px 0 rgba(255,255,255,0.06), inset 0 -0.5px 0 rgba(0,0,0,0.3)",
    textShadow: "none",
    letterSpacing: "0.3px",
    lineHeight: 1 as const,
  } as React.CSSProperties,

  btnOrange: {
    background: "#9a5a10",
    border: "1px solid #7a4808",
    borderTop: "1px solid #a86518",
    borderBottom: "1px solid #6a3e05",
    color: "#e8d8c0",
    boxShadow: "0 1.5px 0 #3a2005, inset 0 0.5px 0 rgba(255,255,255,0.1), inset 0 -0.5px 0 rgba(0,0,0,0.25)",
  } as React.CSSProperties,

  btnBlue: {
    background: "#2a6880",
    border: "1px solid #1e5468",
    borderTop: "1px solid #357a92",
    borderBottom: "1px solid #184858",
    color: "#c8dce8",
    boxShadow: "0 1.5px 0 #0c2830, inset 0 0.5px 0 rgba(255,255,255,0.1), inset 0 -0.5px 0 rgba(0,0,0,0.25)",
  } as React.CSSProperties,

  fLabel: {
    fontSize: "7px", fontWeight: 700 as const, color: "#a06810",
    height: "10px", fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap" as const, lineHeight: "10px",
    letterSpacing: "-0.2px",
  } as React.CSSProperties,

  gLabel: {
    fontSize: "6.5px", fontWeight: 700 as const, color: "#3580a0",
    height: "9px", fontFamily: "Arial, sans-serif",
    whiteSpace: "nowrap" as const, lineHeight: "9px",
    letterSpacing: "-0.2px",
  } as React.CSSProperties,
};

function Btn({ label, fLabel, gLabel, styleOverride, onClick, small }: {
  label: string; fLabel?: string; gLabel?: string;
  styleOverride?: React.CSSProperties; onClick: () => void; small?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "42px" }}>
      <span style={{ ...S.fLabel, visibility: fLabel ? "visible" : "hidden" }}>{fLabel || "."}</span>
      <button
        onClick={onClick}
        style={{ ...S.btn, ...styleOverride, fontSize: small ? "9.5px" : "11px" }}
        onMouseDown={ev => { ev.currentTarget.style.transform = "translateY(1px)"; ev.currentTarget.style.boxShadow = "0 0.5px 0 #18150f, inset 0 1px 2px rgba(0,0,0,0.4)"; }}
        onMouseUp={ev => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.boxShadow = S.btn.boxShadow!; }}
        onMouseLeave={ev => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.boxShadow = S.btn.boxShadow!; }}
      >
        {label}
      </button>
      <span style={{ ...S.gLabel, visibility: gLabel ? "visible" : "hidden" }}>{gLabel || "."}</span>
    </div>
  );
}

function useResponsiveScale(baseWidth: number) {
  const [scale, setScale] = useState(1.25);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) { setScale(1.25); }
      else if (w >= 768) { setScale(Math.min(1.0, (w - 40) / baseWidth)); }
      else { setScale(Math.min(1.0, (w - 24) / baseWidth)); }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [baseWidth]);
  return scale;
}

export function HP12CCalculatorBody() {
  const e = useHP12CEngine();
  const [glossary, setGlossary] = useState(false);
  const scale = useResponsiveScale(500);

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", userSelect: "none", position: "relative" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: "500px" }}>
      {/* Beige shell */}
      <div style={{
        background: "linear-gradient(170deg, #b5aa88 0%, #a89e7a 50%, #9e9470 100%)",
        borderRadius: "6px",
        padding: "10px 10px 5px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.2)",
      }}>
        {/* LCD */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "4px", marginBottom: "6px" }}>
          <div style={{
            flex: 1, borderRadius: "3px", padding: "8px 14px", textAlign: "right" as const,
            background: "linear-gradient(180deg, #8a8e60 0%, #7e825a 50%, #747850 100%)",
            border: "1px solid #5a5e3a",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(255,255,255,0.06)",
          }}>
            <span style={{
              fontFamily: "'Orbitron', 'Courier New', monospace",
              fontSize: "26px", fontWeight: 700, color: "#1a1c0e",
              letterSpacing: "3px", lineHeight: 1,
              opacity: 0.85,
            }}>
              {e.display}
            </span>
          </div>
          <button onClick={() => setGlossary(true)} style={{
            width: "22px", flexShrink: 0, borderRadius: "3px", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            background: "linear-gradient(180deg, #8a8e60, #7e825a)",
            border: "1px solid #5a5e3a",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }} title="Glossário">
            <Info style={{ width: "12px", height: "12px", color: "#2a3018", opacity: 0.7 }} />
          </button>
        </div>

        {/* Dark body */}
        <div style={{
          background: "#2a2620",
          borderRadius: "4px", padding: "4px 6px 6px",
          border: "1px solid #3a3630",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
        }}>
          {/* Financial readout */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "6.5px", fontFamily: "monospace", color: "rgba(180,150,80,0.45)",
            padding: "0 1px 3px", lineHeight: 1,
          }}>
            <span>n={e.fin.n.toFixed(0)}</span>
            <span>i={e.fin.i.toFixed(2)}%</span>
            <span>PV={e.fin.pv.toFixed(0)}</span>
            <span>PMT={e.fin.pmt.toFixed(0)}</span>
            <span>FV={e.fin.fv.toFixed(0)}</span>
          </div>

          {/* ROW 1 */}
          <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
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

          {/* ROW 2 */}
          <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
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

          {/* ROW 3+4 with ENTER */}
          <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", gap: "3px" }}>
                <Btn label="R/S" fLabel="P/R"  gLabel="PSE" onClick={() => {}} small />
                <Btn label="SST" fLabel="Σ"    gLabel="BST" onClick={() => {}} small />
                <Btn label="R↓"  fLabel="PRGM" gLabel="GTO" onClick={() => {}} />
                <Btn label="x⇌y" fLabel="FIN"  gLabel="x≤y" onClick={() => e.swapXY()} small />
                <Btn label="CLx" fLabel="REG"  gLabel="x=0" onClick={e.clx} small />
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                <Btn label="ON"  onClick={e.onKey} />
                <Btn label="f"   onClick={() => {}} styleOverride={S.btnOrange} />
                <Btn label="g"   onClick={() => {}} styleOverride={S.btnBlue} />
                <Btn label="STO" onClick={() => {}} small />
                <Btn label="RCL" onClick={() => {}} small />
              </div>
            </div>

            {/* ENTER — 2-row span */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "42px" }}>
              <span style={S.fLabel}>PREFIX</span>
              <button
                onClick={e.enter}
                style={{
                  ...S.btn,
                  height: "calc(27px * 2 + 19px)",
                  flexDirection: "column" as const,
                  fontSize: "8.5px", letterSpacing: "1.5px", lineHeight: "1.2",
                }}
                onMouseDown={ev => { ev.currentTarget.style.transform = "translateY(1px)"; ev.currentTarget.style.boxShadow = "0 0.5px 0 #18150f, inset 0 1px 2px rgba(0,0,0,0.4)"; }}
                onMouseUp={ev => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.boxShadow = S.btn.boxShadow!; }}
                onMouseLeave={ev => { ev.currentTarget.style.transform = "none"; ev.currentTarget.style.boxShadow = S.btn.boxShadow!; }}
              >
                E<br/>N<br/>T<br/>E<br/>R
              </button>
              <span style={S.gLabel}>LSTx</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", gap: "3px" }}>
                <Btn label="1"  gLabel="x̂,r" onClick={() => e.num("1")} />
                <Btn label="2"  gLabel="ŷ,r" onClick={() => e.num("2")} />
                <Btn label="3"  gLabel="n!"  onClick={() => e.num("3")} />
                <Btn label="—"               onClick={() => e.op("-")} />
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                <Btn label="0"  gLabel="x̄"  onClick={() => e.num("0")} />
                <Btn label="·"  gLabel="s"   onClick={() => e.num(".")} />
                <Btn label="Σ+" gLabel="Σ−"  onClick={() => {}} />
                <Btn label="+"               onClick={() => e.op("+")} />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <GlossaryPanel open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}

export function HP12CCalculator() { return null; }
