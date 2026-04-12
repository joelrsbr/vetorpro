import { useState, useCallback, useEffect, useRef } from "react";
import { Info, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   HP 12C Financial Calculator — Pixel-Accurate Simulator
   ═══════════════════════════════════════════════════════ */

const STORAGE_KEY = "hp12c_session";

// ─── Types ───
interface FinRegs { n: number; i: number; pv: number; pmt: number; fv: number }
type Modifier = null | "f" | "g";

type Stack4 = [number, number, number, number]; // [T, Z, Y, X]

interface HP12CState {
  stack: Stack4;
  lastX: number;
  stackLiftEnabled: boolean;
  enterJustPressed: boolean;
  currentInput: string;
  isEnteringNumber: boolean;
  fin: FinRegs;
  mem: number[];
  isOn: boolean;
  beginMode: boolean;
  fix: number;
  error: boolean;
}

function defaultState(): HP12CState {
  return {
    stack: [0, 0, 0, 0],
    lastX: 0,
    stackLiftEnabled: false,
    enterJustPressed: false,
    currentInput: "0",
    isEnteringNumber: false,
    fin: { n: 0, i: 0, pv: 0, pmt: 0, fv: 0 },
    mem: Array(10).fill(0),
    isOn: true,
    beginMode: false,
    fix: 2,
    error: false,
  };
}

function isValidState(value: unknown): value is HP12CState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<HP12CState>;
  return Array.isArray(state.stack)
    && state.stack.length === 4
    && typeof state.lastX === "number"
    && typeof state.stackLiftEnabled === "boolean"
    && typeof state.enterJustPressed === "boolean"
    && typeof state.currentInput === "string"
    && typeof state.isEnteringNumber === "boolean"
    && Array.isArray(state.mem)
    && typeof state.fix === "number";
}

function loadState(): HP12CState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
    }
  } catch {}
  return defaultState();
}

function fmt(v: number, fix: number): string {
  if (!isFinite(v)) return "Error";
  if (Math.abs(v) > 9999999999 || (Math.abs(v) < 0.0000001 && v !== 0)) {
    return v.toExponential(fix);
  }
  return v.toFixed(fix);
}

// ─── Stack helpers ───
function parseInput(input: string): number {
  const value = parseFloat(input);
  return Number.isFinite(value) ? value : 0;
}

function valueToInput(value: number): string {
  if (!Number.isFinite(value) || Object.is(value, -0)) return "0";
  return String(value);
}

function getX(stack: Stack4): number {
  return stack[3];
}

function setX(stack: Stack4, value: number): Stack4 {
  return [stack[0], stack[1], stack[2], value];
}

function liftStack(stack: Stack4): Stack4 {
  return [stack[1], stack[2], stack[3], stack[3]];
}

function dropStack(stack: Stack4, result: number): Stack4 {
  return [stack[0], stack[0], stack[1], result];
}

function swapXYStack(stack: Stack4): Stack4 {
  return [stack[0], stack[1], stack[3], stack[2]];
}

function rollDownStack(stack: Stack4): Stack4 {
  return [stack[1], stack[2], stack[3], stack[0]];
}

function getDisplayValue(state: HP12CState): string {
  if (state.error) return "Error";
  if (state.isEnteringNumber) return state.currentInput;
  return fmt(getX(state.stack), state.fix);
}

// ─── RPN Engine ───
function useHP12CEngine() {
  const [s, setS] = useState<HP12CState>(loadState);
  const [modifier, setModifier] = useState<Modifier>(null);
  const [stoMode, setStoMode] = useState(false);
  const [rclMode, setRclMode] = useState(false);
  const [stoArith, setStoArith] = useState<string | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const upd = useCallback((partial: Partial<HP12CState>) => {
    setS(prev => ({ ...prev, ...partial }));
  }, []);

  // ── Digit entry ──
  const num = useCallback((d: string) => {
    if (!s.isOn) return;
    // STO mode handling
    if (stoMode && !stoArith) {
      if (d >= "0" && d <= "9") {
        const idx = parseInt(d);
        setS(prev => {
          const m = [...prev.mem];
          m[idx] = getX(prev.stack);
          return { ...prev, mem: m };
        });
        setStoMode(false); return;
      }
      if (["+", "-", "×", "÷"].includes(d)) { setStoArith(d); return; }
      setStoMode(false); return;
    }
    if (stoMode && stoArith) {
      if (d >= "0" && d <= "9") {
        const idx = parseInt(d);
        setS(prev => {
          const m = [...prev.mem];
          const xv = getX(prev.stack);
          switch (stoArith) {
            case "+": m[idx] += xv; break;
            case "-": m[idx] -= xv; break;
            case "×": m[idx] *= xv; break;
            case "÷": if (xv !== 0) m[idx] /= xv; break;
          }
          return { ...prev, mem: m };
        });
        setStoMode(false); setStoArith(null); return;
      }
    }
    // RCL mode handling
    if (rclMode) {
      if (d >= "0" && d <= "9") {
        const idx = parseInt(d);
        setS(prev => ({
          ...prev,
          stack: setX(prev.stack, prev.mem[idx]),
          currentInput: valueToInput(prev.mem[idx]),
          stackLiftEnabled: true,
          isEnteringNumber: false,
          enterJustPressed: false,
          error: false,
        }));
        setRclMode(false); return;
      }
      setRclMode(false); return;
    }
    setStoMode(false); setRclMode(false); setStoArith(null);

    setS(prev => {
      let stack = prev.stack;
      let currentInput = prev.currentInput;
      let stackLiftEnabled = prev.stackLiftEnabled;

      if (stackLiftEnabled === true && prev.isEnteringNumber === false) {
        stack = liftStack(stack);
        stackLiftEnabled = false;
        currentInput = "0";
      }

      let nextInput = currentInput;
      if (d === ".") {
        if (nextInput.includes(".")) return prev;
        nextInput = `${nextInput}.`;
      } else if (nextInput === "0") {
        nextInput = d;
      } else {
        nextInput = nextInput + d;
      }

      return {
        ...prev,
        stack: setX(stack, parseInput(nextInput)),
        currentInput: nextInput,
        isEnteringNumber: true,
        enterJustPressed: false,
        stackLiftEnabled: false,
        error: false,
      };
    });
    setModifier(null);
  }, [s, stoMode, rclMode, stoArith]);

  // ── ENTER ──
  const enter = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const normalizedX = parseInput(prev.currentInput);
      const stackWithX = setX(prev.stack, normalizedX);
      return {
        ...prev,
        stack: liftStack(stackWithX),
        stackLiftEnabled: true,
        isEnteringNumber: false,
        enterJustPressed: true,
        currentInput: valueToInput(normalizedX),
        error: false,
      };
    });
    setModifier(null);
  }, [s.isOn]);

  // ── CLx ──
  const clx = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => ({
      ...prev,
      stack: setX(prev.stack, 0),
      currentInput: "0",
      stackLiftEnabled: false,
      isEnteringNumber: false,
      error: false,
    }));
  }, [s.isOn, upd]);

  const clAll = useCallback(() => {
    setS(defaultState());
    setModifier(null); setStoMode(false); setRclMode(false); setStoArith(null);
  }, []);

  const clearFin = useCallback(() => {
    upd({ fin: { n: 0, i: 0, pv: 0, pmt: 0, fv: 0 } });
    setModifier(null);
  }, [upd]);

  const clearReg = useCallback(() => {
    upd({ mem: Array(10).fill(0) });
    setModifier(null);
  }, [upd]);

  const onKey = useCallback(() => {
    if (!s.isOn) {
      upd({ isOn: true, currentInput: "0", isEnteringNumber: false, error: false });
      return;
    }
    num(".");
  }, [s.isOn, upd, num]);

  const setError = useCallback(() => {
    setS(prev => ({
      ...prev,
      error: true,
      stackLiftEnabled: true,
      isEnteringNumber: false,
      enterJustPressed: false,
    }));
    setModifier(null);
  }, []);

  const applyUnary = useCallback((fn: (x: number) => number) => {
    setS(prev => {
      if (!prev.isOn || prev.error) return prev;
      const stackWithX = setX(prev.stack, parseInput(prev.currentInput));
      const xv = getX(stackWithX);
      const result = fn(xv);
      if (!Number.isFinite(result)) {
        return {
          ...prev,
          error: true,
          stackLiftEnabled: true,
          isEnteringNumber: false,
          enterJustPressed: false,
        };
      }

      return {
        ...prev,
        stack: setX(stackWithX, result),
        lastX: xv,
        currentInput: valueToInput(result),
        stackLiftEnabled: true,
        isEnteringNumber: false,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

  const applyBinary = useCallback((fn: (a: number, b: number) => number) => {
    setS(prev => {
      if (!prev.isOn || prev.error) return prev;
      const stackWithX = setX(prev.stack, parseInput(prev.currentInput));
      const a = stackWithX[2];
      const b = stackWithX[3];
      const result = fn(a, b);
      if (!Number.isFinite(result)) {
        return {
          ...prev,
          error: true,
          stackLiftEnabled: true,
          isEnteringNumber: false,
          enterJustPressed: false,
        };
      }

      return {
        ...prev,
        stack: dropStack(stackWithX, result),
        lastX: b,
        currentInput: valueToInput(result),
        stackLiftEnabled: true,
        isEnteringNumber: false,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

  // ── Arithmetic ──
  const doOp = useCallback((o: string) => {
    switch (o) {
      case "+": applyBinary((a, b) => a + b); return;
      case "-": applyBinary((a, b) => a - b); return;
      case "×": applyBinary((a, b) => a * b); return;
      case "÷":
        applyBinary((a, b) => {
          if (b === 0) return Number.NaN;
          return a / b;
        });
        return;
      case "yˣ": applyBinary((a, b) => Math.pow(a, b)); return;
      case "1/x":
        applyUnary((xv) => (xv === 0 ? Number.NaN : 1 / xv));
        return;
      case "%T":
        applyUnary((xv) => {
          const yv = s.stack[2];
          return yv !== 0 ? (xv / yv) * 100 : 0;
        });
        return;
      case "Δ%":
        applyUnary((xv) => {
          const yv = s.stack[2];
          return yv !== 0 ? ((xv - yv) / yv) * 100 : 0;
        });
        return;
      case "%":
        applyUnary((xv) => s.stack[2] * xv / 100);
        return;
      case "CHS":
        setS(prev => {
          if (!prev.isOn) return prev;
          const stackWithX = setX(prev.stack, parseInput(prev.currentInput));
          const nextX = getX(stackWithX) * -1;
          return {
            ...prev,
            stack: setX(stackWithX, nextX),
            currentInput: valueToInput(nextX),
            error: false,
          };
        });
        setModifier(null);
        return;
      case "√x":
        applyUnary((xv) => (xv < 0 ? Number.NaN : Math.sqrt(xv)));
        return;
      case "eˣ": applyUnary((xv) => Math.exp(xv)); return;
      case "LN":
        applyUnary((xv) => (xv <= 0 ? Number.NaN : Math.log(xv)));
        return;
      case "FRAC": applyUnary((xv) => xv - Math.trunc(xv)); return;
      case "INTG": applyUnary((xv) => Math.trunc(xv)); return;
      case "n!":
        applyUnary((xv) => {
          if (xv < 0 || xv > 69 || xv !== Math.floor(xv)) return Number.NaN;
          let result = 1;
          for (let i = 2; i <= xv; i++) result *= i;
          return result;
        });
        return;
      default:
        return;
    }
  }, [applyBinary, applyUnary, s.stack]);

  const swapXY = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => ({
      ...prev,
      stack: swapXYStack(setX(prev.stack, parseInput(prev.currentInput))),
      currentInput: valueToInput(swapXYStack(setX(prev.stack, parseInput(prev.currentInput)))[3]),
      isEnteringNumber: false,
      stackLiftEnabled: true,
      enterJustPressed: false,
      error: false,
    }));
  }, [s.isOn]);

  const rollDown = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const nextStack = rollDownStack(setX(prev.stack, parseInput(prev.currentInput)));
      return {
        ...prev,
        stack: nextStack,
        currentInput: valueToInput(nextStack[3]),
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      };
    });
  }, [s.isOn]);

  const rclLastX = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => ({
      ...prev,
      stack: setX(prev.stack, prev.lastX),
      currentInput: valueToInput(prev.lastX),
      isEnteringNumber: false,
      stackLiftEnabled: true,
      enterJustPressed: false,
      error: false,
    }));
  }, [s.isOn]);

  // ── Financial ──
  const storeFin = useCallback((k: keyof FinRegs) => {
    const v = getX(s.stack);
    upd({ fin: { ...s.fin, [k]: v }, isEnteringNumber: false, stackLiftEnabled: true, enterJustPressed: false });
    setModifier(null);
  }, [s, upd]);

  const solveFin = useCallback((k: keyof FinRegs) => {
    const { n, i: ip, pv, pmt, fv } = s.fin;
    const rate = ip / 100;
    const beg = s.beginMode ? 1 : 0;
    let res = 0;
    try {
      switch (k) {
        case "n": {
          if (rate === 0) {
            if (pmt === 0) { setError(); return; }
            res = -(pv + fv) / pmt;
          } else {
            const c = 1 + rate * beg;
            const nm = Math.log((-fv * rate + pmt * c) / (pv * rate + pmt * c));
            const den = Math.log(1 + rate);
            res = nm / den;
          }
          break;
        }
        case "i": {
          let guess = 0.01;
          for (let iter = 0; iter < 500; iter++) {
            const g = guess;
            if (Math.abs(g) < 1e-14) { guess = 0.0001; continue; }
            const c = 1 + g * beg;
            const f1 = Math.pow(1 + g, n);
            const fVal = pv * f1 + pmt * c * (f1 - 1) / g + fv;
            const df1 = n * Math.pow(1 + g, n - 1);
            const dfVal = pv * df1 + pmt * (beg * (f1 - 1) / g + c * (df1 * g - (f1 - 1)) / (g * g));
            const delta = fVal / dfVal;
            guess -= delta;
            if (Math.abs(delta) < 1e-12) break;
          }
          res = guess * 100;
          break;
        }
        case "pv": {
          if (rate === 0) { res = -pmt * n - fv; }
          else {
            const c = 1 + rate * beg;
            const f1 = Math.pow(1 + rate, n);
            res = -(pmt * c * (f1 - 1) / (rate * f1) + fv / f1);
          }
          break;
        }
        case "pmt": {
          if (rate === 0) { res = n !== 0 ? -(pv + fv) / n : 0; }
          else {
            const c = 1 + rate * beg;
            const f1 = Math.pow(1 + rate, n);
            res = -(pv * f1 + fv) * rate / (c * (f1 - 1));
          }
          break;
        }
        case "fv": {
          if (rate === 0) { res = -pv - pmt * n; }
          else {
            const c = 1 + rate * beg;
            const f1 = Math.pow(1 + rate, n);
            res = -pv * f1 - pmt * c * (f1 - 1) / rate;
          }
          break;
        }
      }
      if (!isFinite(res)) { setError(); return; }
      setS(prev => ({
        ...prev,
        fin: { ...prev.fin, [k]: res },
        stack: setX(prev.stack, res),
        currentInput: valueToInput(res),
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      }));
    } catch {
      setError();
    }
    setModifier(null);
  }, [s, setError]);

  const handleFinKey = useCallback((k: keyof FinRegs) => {
    if (!s.isOn) return;
    if (rclMode) {
      setS(prev => ({
        ...prev,
        stack: setX(prev.stack, prev.fin[k]),
        currentInput: valueToInput(prev.fin[k]),
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      }));
      setRclMode(false); return;
    }
    if (modifier === "f") { solveFin(k); return; }
    // TVM rule: if user entered a number → STORE, otherwise → CALCULATE
    if (s.isEnteringNumber) {
      storeFin(k);
    } else {
      solveFin(k);
    }
  }, [s, modifier, rclMode, storeFin, solveFin, upd]);

  const setMod = useCallback((m: Modifier) => { setModifier(prev => prev === m ? null : m); }, []);
  const handleSto = useCallback(() => { if (s.isOn) { setStoMode(true); setRclMode(false); setStoArith(null); } }, [s.isOn]);
  const handleRcl = useCallback(() => {
    if (!s.isOn) return;
    if (modifier === "g") { rclLastX(); setModifier(null); return; }
    setRclMode(true); setStoMode(false);
  }, [s.isOn, modifier, rclLastX]);

  const setFix = useCallback((n: number) => {
    upd({ fix: n, isEnteringNumber: false });
    setModifier(null);
  }, [upd]);

  const toggleBeg = useCallback((on: boolean) => {
    upd({ beginMode: on });
    setModifier(null);
  }, [upd]);

  return {
    display: getDisplayValue(s), fin: s.fin, isOn: s.isOn, modifier, stoMode, rclMode,
    beginMode: s.beginMode, fix: s.fix, error: s.error,
    num, enter, clx, clAll, clearFin, clearReg, onKey,
    op: doOp, swapXY, rollDown, rclLastX,
    handleFinKey, handleSto, handleRcl,
    setMod, setFix, toggleBeg,
  };
}

// ─── Glossary ───
function GlossaryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#444] rounded-lg p-5 max-w-[420px] w-full max-h-[80vh] overflow-y-auto text-xs space-y-2 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
        <p className="font-bold text-amber-300 text-sm mb-3">📖 Glossário HP 12C</p>
        <div className="space-y-1.5 text-amber-200/80">
          <p><strong className="text-amber-300">n</strong> — Número de períodos</p>
          <p><strong className="text-amber-300">i</strong> — Taxa de juros por período (%)</p>
          <p><strong className="text-amber-300">PV</strong> — Valor Presente</p>
          <p><strong className="text-amber-300">PMT</strong> — Pagamento periódico</p>
          <p><strong className="text-amber-300">FV</strong> — Valor Futuro</p>
          <p><strong className="text-amber-300">CHS</strong> — Troca sinal (+/−)</p>
          <p><strong className="text-amber-300">ENTER</strong> — Empilha valor (RPN)</p>
          <p><strong className="text-amber-300">STO</strong> — Armazena em M0–M9</p>
          <p><strong className="text-amber-300">RCL</strong> — Recupera de M0–M9</p>
          <p><strong className="text-amber-300">CLx</strong> — Limpa X</p>
          <p><strong className="text-amber-300">Yˣ</strong> — Y elevado a X</p>
          <p><strong className="text-amber-300">f</strong> — Funções secundárias (laranja)</p>
          <p><strong className="text-amber-300">g</strong> — Funções secundárias (azul)</p>
          <p><strong className="text-amber-300">g √x</strong> — Raiz quadrada</p>
          <p><strong className="text-amber-300">g eˣ</strong> — Exponencial</p>
          <p><strong className="text-amber-300">g LN</strong> — Logaritmo natural</p>
          <p><strong className="text-amber-300">BEGIN</strong> — Anuidade antecipada</p>
          <p><strong className="text-amber-300">LASTX</strong> — Último X (g ENTER)</p>
        </div>
      </div>
    </div>
  );
}

// ─── Button component ───
function Btn({ label, fLbl, gLbl, style: so, onClick, tall, className: cn }: {
  label: string; fLbl?: string; gLbl?: string;
  style?: React.CSSProperties; onClick: () => void; tall?: boolean; className?: string;
}) {
  const base: React.CSSProperties = {
    background: "#2A2A2A",
    border: "1px solid #3a3a3a",
    borderTop: "1px solid #444",
    borderBottom: "2px solid #111",
    borderRadius: "3px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 0 #0a0a0a, inset 0 1px 0 rgba(255,255,255,0.08)",
    userSelect: "none",
    lineHeight: 1,
    padding: 0,
    width: "100%",
    height: tall ? "100%" : "28px",
    ...so,
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
      gridRow: tall ? "span 2" : undefined,
    }} className={cn}>
      <span style={{
        fontSize: "7.5px", fontWeight: 700, color: "#F47B20",
        height: "10px", lineHeight: "10px", whiteSpace: "nowrap",
        fontFamily: "Arial, sans-serif",
        visibility: fLbl ? "visible" : "hidden",
      }}>{fLbl || "."}</span>
      <button
        onClick={onClick}
        style={base}
        onMouseDown={ev => { ev.currentTarget.style.transform = "translateY(1px)"; ev.currentTarget.style.boxShadow = "0 0 0 #0a0a0a, inset 0 2px 3px rgba(0,0,0,0.5)"; }}
        onMouseUp={ev => { ev.currentTarget.style.transform = ""; ev.currentTarget.style.boxShadow = base.boxShadow!; }}
        onMouseLeave={ev => { ev.currentTarget.style.transform = ""; ev.currentTarget.style.boxShadow = base.boxShadow!; }}
      >
        {tall ? (
          <span style={{ writingMode: "vertical-lr", letterSpacing: "2px", fontSize: "9px" }}>ENTER</span>
        ) : label}
      </button>
      <span style={{
        fontSize: "7px", fontWeight: 700, color: "#3FC0C0",
        height: "9px", lineHeight: "9px", whiteSpace: "nowrap",
        fontFamily: "Arial, sans-serif",
        visibility: gLbl ? "visible" : "hidden",
      }}>{gLbl || "."}</span>
    </div>
  );
}

// ─── Responsive scaling ───
function useResponsiveScale(baseW: number) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setScale(1.25);
      else if (w >= 768) setScale(Math.min(1.1, (w - 40) / baseW));
      else setScale(Math.min(1.0, (w - 16) / baseW));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [baseW]);
  return scale;
}

// ─── Main component ───
export function HP12CCalculatorBody() {
  const e = useHP12CEngine();
  const [glossary, setGlossary] = useState(false);
  const scale = useResponsiveScale(520);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard support
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (!e.isOn) return;
      const k = ev.key;
      if (k >= "0" && k <= "9") { e.num(k); ev.preventDefault(); }
      else if (k === ".") { e.num("."); ev.preventDefault(); }
      else if (k === "Enter") { e.enter(); ev.preventDefault(); }
      else if (k === "+") { e.op("+"); ev.preventDefault(); }
      else if (k === "-") { e.op("-"); ev.preventDefault(); }
      else if (k === "*") { e.op("×"); ev.preventDefault(); }
      else if (k === "/") { e.op("÷"); ev.preventDefault(); }
      else if (k === "Backspace") { e.clx(); ev.preventDefault(); }
      else if (k === "Escape") { e.clAll(); ev.preventDefault(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [e]);

  const handleWithModifier = (normal: () => void, fFn?: () => void, gFn?: () => void) => {
    if (e.modifier === "f" && fFn) { fFn(); return; }
    if (e.modifier === "g" && gFn) { gFn(); return; }
    normal();
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "4px 3px",
    padding: "6px",
  };

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", userSelect: "none" }} ref={containerRef}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: "520px" }}>
        {/* Calculator body */}
        <div style={{
          background: "#B8A060",
          borderRadius: "16px",
          padding: "12px",
          border: "2px solid #5A4A1A",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)",
        }}>
          {/* ─── Display ─── */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "0" }}>
            <div style={{
              flex: 1, borderRadius: "4px", padding: "4px 12px",
              background: "#5C5E3A",
              border: "2px solid #3a3c22",
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.03)",
            }}>
              {/* Status indicators */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "8px", fontFamily: "Arial, sans-serif", color: "#8a8a60",
                height: "12px", opacity: 0.9, padding: "0 2px",
              }}>
                <span style={{ fontWeight: 700, color: e.modifier === "f" ? "#F47B20" : e.modifier === "g" ? "#3FC0C0" : "transparent" }}>
                  {e.modifier === "f" ? "f" : e.modifier === "g" ? "g" : "."}
                </span>
                <span style={{ fontWeight: 700, color: "#8a8a60", visibility: e.beginMode ? "visible" : "hidden" }}>BEGIN</span>
                <span style={{ fontWeight: 700, color: "#8a8a60", visibility: e.stoMode ? "visible" : (e.rclMode ? "visible" : "hidden") }}>
                  {e.stoMode ? "STO" : "RCL"}
                </span>
              </div>
              {/* LCD digits */}
              <div style={{
                background: "#4A4C2A",
                borderRadius: "2px",
                padding: "6px 10px",
                textAlign: "right",
                border: "1px solid #3a3c1a",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)",
              }}>
                <span style={{
                  fontFamily: "'DSEG7 Classic', 'Orbitron', 'Courier New', monospace",
                  fontSize: "30px", fontWeight: 400, color: "#C8D820",
                  letterSpacing: "3px", lineHeight: 1,
                  textShadow: "0 0 6px rgba(200,216,32,0.3)",
                }}>
                  {e.display}
                </span>
              </div>
            </div>
            {/* Info button */}
            <button onClick={() => setGlossary(true)} style={{
              width: "24px", flexShrink: 0, borderRadius: "4px", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              background: "#5C5E3A", border: "2px solid #3a3c22",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
            }}>
              <Info style={{ width: "14px", height: "14px", color: "#8a8a60", opacity: 0.8 }} />
            </button>
          </div>

          {/* Dark separator strip */}
          <div style={{
            height: "3px", background: "linear-gradient(to right, transparent, #3a3018, #3a3018, transparent)",
            margin: "8px 0 6px",
            borderRadius: "1px",
          }} />

          {/* ─── Button Grid (10 columns) ─── */}
          <div style={{
            background: "#2a2620",
            borderRadius: "8px",
            border: "1px solid #3a3630",
            boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}>
            {/* Financial register readout */}
            <div style={{
              display: "flex", justifyContent: "space-around",
              fontSize: "7px", fontFamily: "monospace", color: "rgba(200,184,122,0.5)",
              padding: "3px 8px 0",
            }}>
              <span>n={e.fin.n.toFixed(0)}</span>
              <span>i={e.fin.i.toFixed(2)}%</span>
              <span>PV={e.fin.pv.toFixed(0)}</span>
              <span>PMT={e.fin.pmt.toFixed(0)}</span>
              <span>FV={e.fin.fv.toFixed(0)}</span>
            </div>

            <div style={gridStyle}>
              {/* ══ ROW 1 ══ */}
              <Btn label="n"   fLbl="AMORT" gLbl="12×"  onClick={() => e.handleFinKey("n")} />
              <Btn label="i"   fLbl="INT"   gLbl="12÷"  onClick={() => e.handleFinKey("i")} />
              <Btn label="PV"  fLbl="NPV"   gLbl="CFo"  onClick={() => e.handleFinKey("pv")} />
              <Btn label="PMT" fLbl="RND"   gLbl="CFj"  onClick={() => e.handleFinKey("pmt")} />
              <Btn label="FV"  fLbl="IRR"   gLbl="Nj"   onClick={() => e.handleFinKey("fv")} />
              <Btn label="CHS" fLbl="DATE"               onClick={() => e.op("CHS")} />
              <Btn label="7"                gLbl="BEG"   onClick={() => handleWithModifier(() => e.num("7"), undefined, () => e.toggleBeg(true))} />
              <Btn label="8"                gLbl="END"   onClick={() => handleWithModifier(() => e.num("8"), undefined, () => e.toggleBeg(false))} />
              <Btn label="9"                gLbl="MEM"   onClick={() => e.num("9")} />
              <Btn label="÷"                              onClick={() => e.op("÷")} />

              {/* ══ ROW 2 ══ */}
              <Btn label="Yˣ"  fLbl="PRICE" gLbl="√x"   onClick={() => handleWithModifier(() => e.op("yˣ"), undefined, () => e.op("√x"))} />
              <Btn label="1/x" fLbl="YTM"   gLbl="eˣ"   onClick={() => handleWithModifier(() => e.op("1/x"), undefined, () => e.op("eˣ"))} />
              <Btn label="%T"  fLbl="SL"     gLbl="LN"   onClick={() => handleWithModifier(() => e.op("%T"), undefined, () => e.op("LN"))} />
              <Btn label="Δ%"  fLbl="SOYD"   gLbl="FRAC" onClick={() => handleWithModifier(() => e.op("Δ%"), undefined, () => e.op("FRAC"))} />
              <Btn label="%"   fLbl="DB"     gLbl="INTG" onClick={() => handleWithModifier(() => e.op("%"), undefined, () => e.op("INTG"))} />
              <Btn label="EEX" fLbl="ΔDYS"               onClick={() => {}} />
              <Btn label="4"                gLbl="D.MY"  onClick={() => handleWithModifier(() => e.num("4"), () => e.setFix(4))} />
              <Btn label="5"                gLbl="M.DY"  onClick={() => handleWithModifier(() => e.num("5"), () => e.setFix(5))} />
              <Btn label="6"                gLbl="x̄w"   onClick={() => handleWithModifier(() => e.num("6"), () => e.setFix(6))} />
              <Btn label="×"                              onClick={() => e.op("×")} />

              {/* ══ ROW 3 ══ */}
              <Btn label="R/S" fLbl="P/R"   gLbl="PSE"  onClick={() => {}} />
              <Btn label="SST" fLbl="Σ"     gLbl="BST"  onClick={() => {}} />
              <Btn label="R↓"  fLbl="PRGM"  gLbl="GTO"  onClick={() => e.rollDown()} />
              <Btn label="x⇌y" fLbl="FIN"   gLbl="x≤y"  onClick={() => handleWithModifier(() => e.swapXY(), () => e.clearFin())} />
              <Btn label="CLx" fLbl="REG"   gLbl="x=0"  onClick={() => handleWithModifier(() => e.clx(), () => e.clearReg())} />
              {/* ENTER — spans rows 3 & 4 */}
              <Btn label="ENTER" fLbl="PREFIX" gLbl="LSTx" tall
                onClick={() => handleWithModifier(() => e.enter(), undefined, () => e.rclLastX())} />
              <Btn label="1"                gLbl="x̂,r"  onClick={() => handleWithModifier(() => e.num("1"), () => e.setFix(1))} />
              <Btn label="2"                gLbl="ŷ,r"  onClick={() => handleWithModifier(() => e.num("2"), () => e.setFix(2))} />
              <Btn label="3"                gLbl="n!"   onClick={() => handleWithModifier(() => e.num("3"), () => e.setFix(3), () => e.op("n!"))} />
              <Btn label="–"                              onClick={() => e.op("-")} />

              {/* ══ ROW 4 ══ */}
              <Btn label="ON"                             onClick={e.onKey} />
              <Btn label="f" onClick={() => e.setMod("f")} style={{
                background: "#F47B20", border: "1px solid #c55f10",
                borderTop: "1px solid #ff8c30", borderBottom: "2px solid #9a4a08",
                color: "#fff",
                boxShadow: "0 2px 0 #6a3505, inset 0 1px 0 rgba(255,255,255,0.15)",
              }} />
              <Btn label="g" onClick={() => e.setMod("g")} style={{
                background: "#3FC0C0", border: "1px solid #2a9090",
                borderTop: "1px solid #50d0d0", borderBottom: "2px solid #1a7070",
                color: "#fff",
                boxShadow: "0 2px 0 #0a4040, inset 0 1px 0 rgba(255,255,255,0.15)",
              }} />
              <Btn label="STO"                           onClick={e.handleSto} />
              <Btn label="RCL"                           onClick={e.handleRcl} />
              {/* col 6 is occupied by ENTER span */}
              <Btn label="0"                gLbl="x̄"   onClick={() => handleWithModifier(() => e.num("0"), () => e.setFix(0))} />
              <Btn label="·"                gLbl="s"    onClick={() => e.num(".")} />
              <Btn label="Σ+"               gLbl="Σ−"  onClick={() => {}} />
              <Btn label="+"                             onClick={() => e.op("+")} />
            </div>
          </div>
        </div>
      </div>
      <GlossaryPanel open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}

export function HP12CCalculator() { return null; }
