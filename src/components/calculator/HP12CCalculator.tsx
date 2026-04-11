import { useState, useCallback, useEffect, useRef } from "react";
import { Info, X } from "lucide-react";

type FinancialValues = { n: number; i: number; pv: number; pmt: number; fv: number };
type Modifier = null | "f" | "g";

const STORAGE_KEY = "hp12c_session";

interface HP12CState {
  display: string;
  stack: [number, number, number, number];
  fin: FinancialValues;
  mem: number[];
  isOn: boolean;
  isNew: boolean;
  lastX: number;
}

function defaultState(): HP12CState {
  return {
    display: "0.00",
    stack: [0, 0, 0, 0],
    fin: { n: 0, i: 0, pv: 0, pmt: 0, fv: 0 },
    mem: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isOn: true,
    isNew: true,
    lastX: 0,
  };
}

function loadState(): HP12CState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultState();
}

function useHP12CEngine() {
  const [s, setS] = useState<HP12CState>(loadState);
  const [modifier, setModifier] = useState<Modifier>(null);
  const [stoMode, setStoMode] = useState(false);
  const [rclMode, setRclMode] = useState(false);

  // Persist to sessionStorage on every state change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const x = parseFloat(s.display) || 0;

  const upd = useCallback((partial: Partial<HP12CState>) => {
    setS(prev => ({ ...prev, ...partial }));
  }, []);

  const pushStack = useCallback((v: number, st: [number, number, number, number]): [number, number, number, number] => {
    return [v, st[0], st[1], st[2]];
  }, []);

  const num = useCallback((d: string) => {
    if (!s.isOn) return;
    // If STO/RCL mode is active and digit 0-9 pressed
    if (stoMode && d >= "0" && d <= "9") {
      const idx = parseInt(d);
      setS(prev => {
        const newMem = [...prev.mem];
        newMem[idx] = parseFloat(prev.display) || 0;
        return { ...prev, mem: newMem };
      });
      setStoMode(false);
      return;
    }
    if (rclMode && d >= "0" && d <= "9") {
      const idx = parseInt(d);
      setS(prev => ({
        ...prev,
        display: prev.mem[idx].toString(),
        isNew: true,
      }));
      setRclMode(false);
      return;
    }
    setStoMode(false);
    setRclMode(false);

    if (s.isNew) {
      upd({ display: d === "." ? "0." : d, isNew: false });
    } else {
      if (d === "." && s.display.includes(".")) return;
      upd({ display: s.display + d });
    }
    setModifier(null);
  }, [s.isOn, s.isNew, s.display, stoMode, rclMode, upd]);

  const enter = useCallback(() => {
    if (!s.isOn) return;
    const val = parseFloat(s.display) || 0;
    upd({ stack: pushStack(val, s.stack), isNew: true });
    setModifier(null);
  }, [s.isOn, s.display, s.stack, upd, pushStack]);

  const clx = useCallback(() => {
    if (!s.isOn) return;
    upd({ display: "0", isNew: true });
  }, [s.isOn, upd]);

  const clAll = useCallback(() => {
    const fresh = defaultState();
    setS(fresh);
    setModifier(null);
    setStoMode(false);
    setRclMode(false);
  }, []);

  const onKey = useCallback(() => {
    if (!s.isOn) {
      upd({ isOn: true, display: "0.00", isNew: true });
      return;
    }
    num(".");
  }, [s.isOn, upd, num]);

  const op = useCallback((o: string) => {
    if (!s.isOn) return;
    const xVal = parseFloat(s.display) || 0;
    const yVal = s.stack[0];
    let r = 0;
    let unary = false;

    switch (o) {
      case "+": r = yVal + xVal; break;
      case "-": r = yVal - xVal; break;
      case "×": r = yVal * xVal; break;
      case "÷": r = xVal !== 0 ? yVal / xVal : 0; break;
      case "Δ%": r = xVal !== 0 ? ((yVal - xVal) / xVal) * 100 : 0; break;
      case "%T": r = yVal !== 0 ? (xVal / yVal) * 100 : 0; break;
      case "yˣ": r = Math.pow(yVal, xVal); break;
      case "1/x": r = xVal !== 0 ? 1 / xVal : 0; unary = true; break;
      case "√x": r = Math.sqrt(Math.abs(xVal)); unary = true; break;
      case "CHS":
        upd({ display: (-(parseFloat(s.display) || 0)).toString() });
        setModifier(null);
        return;
    }

    if (unary) {
      upd({
        display: formatResult(r),
        isNew: true,
        lastX: xVal,
      });
    } else {
      // Binary op: consume Y, drop stack
      upd({
        stack: [s.stack[1], s.stack[2], s.stack[3], s.stack[3]],
        display: formatResult(r),
        isNew: true,
        lastX: xVal,
      });
    }
    setModifier(null);
  }, [s, upd]);

  const swapXY = useCallback(() => {
    if (!s.isOn) return;
    const xVal = parseFloat(s.display) || 0;
    upd({
      display: s.stack[0].toString(),
      stack: [xVal, s.stack[1], s.stack[2], s.stack[3]],
      isNew: true,
    });
  }, [s, upd]);

  const rollDown = useCallback(() => {
    if (!s.isOn) return;
    const xVal = parseFloat(s.display) || 0;
    upd({
      display: s.stack[0].toString(),
      stack: [s.stack[1], s.stack[2], xVal, s.stack[3]],
      isNew: true,
    });
  }, [s, upd]);

  const storeFin = useCallback((k: keyof FinancialValues) => {
    if (!s.isOn) return;
    const val = parseFloat(s.display) || 0;
    upd({
      fin: { ...s.fin, [k]: val },
      isNew: true,
    });
    setModifier(null);
  }, [s, upd]);

  // TVM solver using Newton-Raphson for i, and exact formulas for others
  const solveFin = useCallback((k: keyof FinancialValues) => {
    if (!s.isOn) return;
    const { n, i, pv, pmt, fv } = s.fin;
    const rate = i / 100;
    let res = 0;

    try {
      switch (k) {
        case "n": {
          if (rate === 0) {
            if (pmt !== 0) res = -(pv + fv) / pmt;
          } else {
            const num = Math.log((pmt - fv * rate) / (pmt + pv * rate));
            const den = Math.log(1 + rate);
            res = num / den;
          }
          break;
        }
        case "i": {
          // Newton-Raphson to solve for i
          let guess = 0.01;
          for (let iter = 0; iter < 200; iter++) {
            const g = guess;
            if (g === 0) { guess = 0.0001; continue; }
            const f1 = Math.pow(1 + g, n);
            const pvCalc = pmt * (1 - 1 / f1) / g + fv / f1 + pv;
            const dPv = -pmt * (1 / (g * g) * (1 - 1 / f1) - n / (g * f1)) - n * fv / (f1 * (1 + g));
            const delta = pvCalc / dPv;
            guess -= delta;
            if (Math.abs(delta) < 1e-12) break;
          }
          res = guess * 100;
          break;
        }
        case "pv": {
          if (rate === 0) {
            res = -pmt * n - fv;
          } else {
            const f1 = Math.pow(1 + rate, n);
            res = -pmt * (1 - 1 / f1) / rate - fv / f1;
          }
          break;
        }
        case "pmt": {
          if (rate === 0) {
            if (n !== 0) res = -(pv + fv) / n;
          } else {
            const f1 = Math.pow(1 + rate, n);
            res = -(pv * rate * f1 + fv * rate) / (f1 - 1);
          }
          break;
        }
        case "fv": {
          if (rate === 0) {
            res = -pv - pmt * n;
          } else {
            const f1 = Math.pow(1 + rate, n);
            res = -pv * f1 - pmt * (f1 - 1) / rate;
          }
          break;
        }
      }
      upd({
        fin: { ...s.fin, [k]: res },
        display: res.toFixed(2),
        isNew: true,
      });
    } catch {
      upd({ display: "Error", isNew: true });
    }
    setModifier(null);
  }, [s, upd]);

  const setMod = useCallback((m: Modifier) => {
    setModifier(prev => prev === m ? null : m);
  }, []);

  const handleSto = useCallback(() => {
    if (!s.isOn) return;
    setStoMode(true);
    setRclMode(false);
  }, [s.isOn]);

  const handleRcl = useCallback(() => {
    if (!s.isOn) return;
    setRclMode(true);
    setStoMode(false);
  }, [s.isOn]);

  // Financial key handler: STO stores value, RCL recalls, normal press stores, f-prefix solves
  const handleFinKey = useCallback((k: keyof FinancialValues) => {
    if (!s.isOn) return;
    if (stoMode) {
      storeFin(k);
      setStoMode(false);
      return;
    }
    if (rclMode) {
      upd({ display: s.fin[k].toString(), isNew: true });
      setRclMode(false);
      return;
    }
    if (modifier === "f") {
      solveFin(k);
      setModifier(null);
      return;
    }
    storeFin(k);
  }, [s, modifier, stoMode, rclMode, storeFin, solveFin, upd]);

  return {
    display: s.display,
    fin: s.fin,
    isOn: s.isOn,
    modifier,
    stoMode,
    rclMode,
    num, enter, clx, clAll, onKey, op, swapXY, rollDown,
    handleFinKey, handleSto, handleRcl,
    setMod,
  };
}

function formatResult(v: number): string {
  if (!isFinite(v)) return "Error";
  const s = v.toFixed(10);
  // Remove trailing zeros but keep at least 2 decimals for financial display
  const trimmed = s.replace(/\.?0+$/, "");
  return trimmed.includes(".") ? trimmed : trimmed;
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
          {/* Financial readout + modifier indicator */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "6.5px", fontFamily: "monospace", color: "rgba(180,150,80,0.45)",
            padding: "0 1px 3px", lineHeight: 1,
          }}>
            <span style={{ color: e.modifier === "f" ? "#a06810" : e.modifier === "g" ? "#3580a0" : e.stoMode ? "#c8c0b0" : e.rclMode ? "#c8c0b0" : "rgba(180,150,80,0.45)", fontWeight: (e.modifier || e.stoMode || e.rclMode) ? 700 : 400 }}>
              {e.modifier === "f" ? "f" : e.modifier === "g" ? "g" : e.stoMode ? "STO_" : e.rclMode ? "RCL_" : `n=${e.fin.n.toFixed(0)}`}
            </span>
            <span>i={e.fin.i.toFixed(2)}%</span>
            <span>PV={e.fin.pv.toFixed(0)}</span>
            <span>PMT={e.fin.pmt.toFixed(0)}</span>
            <span>FV={e.fin.fv.toFixed(0)}</span>
          </div>

          {/* ROW 1 */}
          <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
            <Btn label="n"   fLabel="AMORT" gLabel="12×"  onClick={() => e.handleFinKey("n")} />
            <Btn label="i"   fLabel="INT"   gLabel="12÷"  onClick={() => e.handleFinKey("i")} />
            <Btn label="PV"  fLabel="NPV"   gLabel="CFo"  onClick={() => e.handleFinKey("pv")} />
            <Btn label="PMT" fLabel="RND"   gLabel="CFj"  onClick={() => e.handleFinKey("pmt")} small />
            <Btn label="FV"  fLabel="IRR"   gLabel="Nj"   onClick={() => e.handleFinKey("fv")} />
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
                <Btn label="R↓"  fLabel="PRGM" gLabel="GTO" onClick={() => e.rollDown()} />
                <Btn label="x⇌y" fLabel="FIN"  gLabel="x≤y" onClick={() => e.swapXY()} small />
                <Btn label="CLx" fLabel="REG"  gLabel="x=0" onClick={e.clx} small />
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                <Btn label="ON"  onClick={e.onKey} />
                <Btn label="f"   onClick={() => e.setMod("f")} styleOverride={S.btnOrange} />
                <Btn label="g"   onClick={() => e.setMod("g")} styleOverride={S.btnBlue} />
                <Btn label="STO" onClick={() => e.handleSto()} small />
                <Btn label="RCL" onClick={() => e.handleRcl()} small />
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
