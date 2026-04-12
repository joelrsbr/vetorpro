import { useState, useCallback, useEffect, useRef } from "react";
import { Info, X, Minus, Plus } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   HP 12C Financial Calculator — Pixel-Accurate Simulator
   ═══════════════════════════════════════════════════════ */

const STORAGE_KEY = "hp12c_session";

// ─── Types ───
interface FinRegs { n: number; i: number; pv: number; pmt: number; fv: number }
type Modifier = null | "f" | "g";

type Stack4 = [number, number, number, number]; // [T, Z, Y, X]

interface StatRegs { n: number; sumX: number; sumX2: number; sumY: number; sumY2: number; sumXY: number }

interface CashFlowRegs {
  cf0: number;
  cfs: number[];
  njs: number[];
  cfCount: number;
}

function defaultCF(): CashFlowRegs { return { cf0: 0, cfs: [], njs: [], cfCount: 0 }; }

interface HP12CState {
  stack: Stack4;
  lastX: number;
  stackLiftEnabled: boolean;
  enterJustPressed: boolean;
  currentInput: string;
  isEnteringNumber: boolean;
  fin: FinRegs;
  mem: number[];
  stat: StatRegs;
  cf: CashFlowRegs;
  isOn: boolean;
  beginMode: boolean;
  fix: number;
  error: boolean;
}

function defaultStat(): StatRegs { return { n: 0, sumX: 0, sumX2: 0, sumY: 0, sumY2: 0, sumXY: 0 }; }

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
    stat: defaultStat(),
    cf: defaultCF(),
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

function fmt(v: number, fix: number, brazilian = false): string {
  if (!isFinite(v)) return "Error";
  if (Math.abs(v) > 9999999999 || (Math.abs(v) < 0.0000001 && v !== 0)) {
    const s = v.toExponential(fix);
    return brazilian ? s.replace(".", ",") : s;
  }
  const s = v.toFixed(fix);
  if (!brazilian) return s;
  // Brazilian: swap dot/comma
  const [intPart, decPart] = s.split(".");
  const neg = intPart.startsWith("-");
  const digits = neg ? intPart.slice(1) : intPart;
  let formatted = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) formatted += ".";
    formatted += digits[i];
  }
  return (neg ? "-" : "") + formatted + (decPart !== undefined ? "," + decPart : "");
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

function getDisplayValue(state: HP12CState, brazilian = false): string {
  if (state.error) return "Error";
  if (state.isEnteringNumber) {
    if (brazilian) return state.currentInput.replace(".", ",");
    return state.currentInput;
  }
  return fmt(getX(state.stack), state.fix, brazilian);
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
    upd({ mem: Array(10).fill(0), stat: defaultStat(), cf: defaultCF() });
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

  // ── Cash Flow helpers ──
  const storeCFo = useCallback(() => {
    const v = getX(s.stack);
    upd({ cf: { ...s.cf, cf0: v }, isEnteringNumber: false, stackLiftEnabled: true, enterJustPressed: false });
    setModifier(null);
  }, [s, upd]);

  const storeCFj = useCallback(() => {
    setS(prev => {
      const x = getX(prev.stack);
      const newCfs = [...prev.cf.cfs, x];
      const newNjs = [...prev.cf.njs, 1];
      const newCount = prev.cf.cfCount + 1;
      return {
        ...prev,
        cf: { ...prev.cf, cfs: newCfs, njs: newNjs, cfCount: newCount },
        stack: setX(prev.stack, newCount),
        currentInput: valueToInput(newCount),
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

  const storeNj = useCallback(() => {
    setS(prev => {
      if (prev.cf.cfCount === 0) return { ...prev, error: true };
      const x = getX(prev.stack);
      const newNjs = [...prev.cf.njs];
      newNjs[prev.cf.cfCount - 1] = x;
      return {
        ...prev,
        cf: { ...prev.cf, njs: newNjs },
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

  const calcNPV = useCallback(() => {
    setS(prev => {
      const rate = prev.fin.i / 100;
      const { cf0, cfs, njs, cfCount } = prev.cf;
      console.log("NPV calc — CF0:", cf0, "CFs:", cfs, "Njs:", njs, "cfCount:", cfCount, "rate:", rate);
      let npv = cf0;
      let t = 1;
      for (let j = 0; j < cfCount; j++) {
        for (let k = 0; k < njs[j]; k++) {
          npv += cfs[j] / Math.pow(1 + rate, t);
          t++;
        }
      }
      console.log("NPV result:", npv);
      if (!isFinite(npv)) return { ...prev, error: true };
      return {
        ...prev,
        stack: setX(prev.stack, npv),
        currentInput: valueToInput(npv),
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

  const calcIRR = useCallback(() => {
    setS(prev => {
      const { cf0, cfs, njs, cfCount } = prev.cf;
      const computeNPV = (rate: number): number => {
        let npv = cf0;
        let t = 1;
        for (let j = 0; j < cfCount; j++) {
          for (let k = 0; k < njs[j]; k++) {
            npv += cfs[j] / Math.pow(1 + rate, t);
            t++;
          }
        }
        return npv;
      };
      let guess = 0.1;
      for (let iter = 0; iter < 200; iter++) {
        const npvVal = computeNPV(guess);
        const npvDelta = computeNPV(guess + 0.0001);
        const deriv = (npvDelta - npvVal) / 0.0001;
        if (Math.abs(deriv) < 1e-20) break;
        const newGuess = guess - npvVal / deriv;
        if (Math.abs(newGuess - guess) < 1e-9) { guess = newGuess; break; }
        guess = newGuess;
      }
      const result = guess * 100;
      if (!isFinite(result)) return { ...prev, error: true };
      return {
        ...prev,
        stack: setX(prev.stack, result),
        currentInput: valueToInput(result),
        fin: { ...prev.fin, i: result },
        isEnteringNumber: false,
        stackLiftEnabled: true,
        enterJustPressed: false,
        error: false,
      };
    });
    setModifier(null);
  }, []);

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
    // g-shift: CFo, CFj, Nj
    if (modifier === "g") {
      if (k === "pv") { storeCFo(); return; }
      if (k === "pmt") { storeCFj(); return; }
      if (k === "fv") { storeNj(); return; }
      // g+n = 12×, g+i = 12÷ — fall through to other handling or ignore
      setModifier(null); return;
    }
    // f-shift: NPV, IRR (and TVM solve for n, i, pmt)
    if (modifier === "f") {
      if (k === "pv") { calcNPV(); return; }
      if (k === "fv") { calcIRR(); return; }
      solveFin(k); return;
    }
    // Normal: store if entering, else calculate
    if (s.isEnteringNumber) {
      storeFin(k);
    } else {
      solveFin(k);
    }
  }, [s, modifier, rclMode, storeFin, solveFin, storeCFo, storeCFj, storeNj, calcNPV, calcIRR, upd]);

  // ── Statistics ──
  const sigmaPlus = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const stackWithX = setX(prev.stack, parseInput(prev.currentInput));
      const x = getX(stackWithX);
      const y = stackWithX[2]; // Y register
      const st = prev.stat;
      const newStat: StatRegs = {
        n: st.n + 1, sumX: st.sumX + x, sumX2: st.sumX2 + x * x,
        sumY: st.sumY + y, sumY2: st.sumY2 + y * y, sumXY: st.sumXY + x * y,
      };
      const newStack = setX(stackWithX, newStat.n);
      return { ...prev, stack: newStack, stat: newStat, currentInput: valueToInput(newStat.n), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

  const sigmaMinus = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const stackWithX = setX(prev.stack, parseInput(prev.currentInput));
      const x = getX(stackWithX);
      const y = stackWithX[2];
      const st = prev.stat;
      const newStat: StatRegs = {
        n: st.n - 1, sumX: st.sumX - x, sumX2: st.sumX2 - x * x,
        sumY: st.sumY - y, sumY2: st.sumY2 - y * y, sumXY: st.sumXY - x * y,
      };
      const newStack = setX(stackWithX, newStat.n);
      return { ...prev, stack: newStack, stat: newStat, currentInput: valueToInput(newStat.n), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

  const statMeanX = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      if (prev.stat.n === 0) return { ...prev, error: true, stackLiftEnabled: true, isEnteringNumber: false };
      const mean = prev.stat.sumX / prev.stat.n;
      return { ...prev, stack: setX(prev.stack, mean), currentInput: valueToInput(mean), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

  const statMeanYX = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      if (prev.stat.n === 0) return { ...prev, error: true, stackLiftEnabled: true, isEnteringNumber: false };
      const meanY = prev.stat.sumY / prev.stat.n;
      const meanX = prev.stat.sumX / prev.stat.n;
      const newStack: Stack4 = [prev.stack[0], prev.stack[1], meanX, meanY];
      return { ...prev, stack: newStack, currentInput: valueToInput(meanY), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

  const statStdDevX = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const { n, sumX, sumX2 } = prev.stat;
      if (n < 2) return { ...prev, error: true, stackLiftEnabled: true, isEnteringNumber: false };
      const mean = sumX / n;
      const sd = Math.sqrt((sumX2 - n * mean * mean) / (n - 1));
      return { ...prev, stack: setX(prev.stack, sd), currentInput: valueToInput(sd), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

  const statStdDevY = useCallback(() => {
    if (!s.isOn) return;
    setS(prev => {
      const { n, sumY, sumY2 } = prev.stat;
      if (n < 2) return { ...prev, error: true, stackLiftEnabled: true, isEnteringNumber: false };
      const mean = sumY / n;
      const sd = Math.sqrt((sumY2 - n * mean * mean) / (n - 1));
      return { ...prev, stack: setX(prev.stack, sd), currentInput: valueToInput(sd), stackLiftEnabled: true, isEnteringNumber: false, enterJustPressed: false, error: false };
    });
    setModifier(null);
  }, [s.isOn]);

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

  const getDisplay = useCallback((brazilian: boolean) => getDisplayValue(s, brazilian), [s]);

  return {
    display: getDisplayValue(s), getDisplay, fin: s.fin, isOn: s.isOn, modifier, stoMode, rclMode,
    beginMode: s.beginMode, fix: s.fix, error: s.error,
    num, enter, clx, clAll, clearFin, clearReg, onKey,
    op: doOp, swapXY, rollDown, rclLastX,
    handleFinKey, handleSto, handleRcl,
    setMod, setFix, toggleBeg,
    sigmaPlus, sigmaMinus, statMeanX, statMeanYX, statStdDevX, statStdDevY,
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
    background: "#1A1A1A",
    border: "1px solid #333",
    borderTop: "1px solid #444",
    borderBottom: "2px solid #000",
    borderRadius: "4px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 0 #000, inset 0 1px 0 #444",
    userSelect: "none",
    lineHeight: 1,
    padding: "2px 1px",
    width: "100%",
    height: tall ? "100%" : "42px",
    ...so,
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "0px",
      gridRow: tall ? "span 2" : undefined,
    }} className={cn}>
      <span style={{
        fontSize: "8px", fontWeight: 700, color: "#F47B20",
        height: "10px", lineHeight: "10px", whiteSpace: "nowrap",
        fontFamily: "Arial, sans-serif",
        visibility: fLbl ? "visible" : "hidden",
      }}>{fLbl || "."}</span>
      <button
        onClick={onClick}
        style={base}
        onMouseDown={ev => { ev.currentTarget.style.transform = "translateY(1px)"; ev.currentTarget.style.boxShadow = "0 0 0 #000, inset 0 2px 3px rgba(0,0,0,0.5)"; }}
        onMouseUp={ev => { ev.currentTarget.style.transform = ""; ev.currentTarget.style.boxShadow = base.boxShadow!; }}
        onMouseLeave={ev => { ev.currentTarget.style.transform = ""; ev.currentTarget.style.boxShadow = base.boxShadow!; }}
      >
        {tall ? (
          <span style={{ writingMode: "vertical-lr", letterSpacing: "2px", fontSize: "9px" }}>ENTER</span>
        ) : label}
      </button>
      <span style={{
        fontSize: "8px", fontWeight: 700, color: "#3FC0C0",
        height: "10px", lineHeight: "10px", whiteSpace: "nowrap",
        fontFamily: "Arial, sans-serif",
      }}>{gLbl || "\u00A0"}</span>
    </div>
  );
}

// ─── Group label helpers ───
function GroupLabel({ text, span = 1 }: { text: string; span?: number }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
    }}>
      <span style={{ fontSize: "8px", fontWeight: 700, color: "#F47B20", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

function BracketLabel({ text, span }: { text: string; span: number }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
      gap: "1px",
    }}>
      <span style={{ fontSize: "8px", fontWeight: 700, color: "#F47B20", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{text}</span>
      <div style={{ width: "90%", height: "1px", background: "#F47B20", opacity: 0.6 }} />
    </div>
  );
}

// ─── Main component ───
export function HP12CCalculatorBody() {
  const e = useHP12CEngine();
  const [glossary, setGlossary] = useState(false);
  const [useBrazilianFormat, setUseBrazilianFormat] = useState(() => {
    return localStorage.getItem('hp12c-format') === 'BR';
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('hp12c-format', useBrazilianFormat ? 'BR' : 'US');
  }, [useBrazilianFormat]);

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

  const displayText = e.getDisplay(useBrazilianFormat);

  // ─── Zoom state ───
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('hp12c-zoom');
    return saved ? parseFloat(saved) : 0.70;
  });

  useEffect(() => {
    localStorage.setItem('hp12c-zoom', String(zoom));
  }, [zoom]);

  const increaseZoom = () => setZoom(prev => Math.min(prev + 0.05, 1.30));
  const decreaseZoom = () => setZoom(prev => Math.max(prev - 0.05, 0.50));

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "3px",
    padding: "3px 6px 6px",
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", paddingBottom: "60px", userSelect: "none" }} ref={containerRef}>
      {/* Zoom Control Bar */}
      <div style={{
        background: "rgba(0,0,0,0.5)",
        borderRadius: "20px",
        padding: "4px 12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "12px",
        color: "white",
        marginBottom: "8px",
      }}>
        <button
          onClick={decreaseZoom}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#F47B20",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Minus size={16} />
        </button>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <button
          onClick={increaseZoom}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#F47B20",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: "fit-content", margin: "0 auto" }}>
        <div style={{ width: "480px" }}>
        {/* Calculator body */}
        <div style={{
          background: "#A89050",
          borderRadius: "12px",
          padding: "10px",
          border: "2px solid #5A4010",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)",
        }}>
          {/* ─── Display ─── */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "0" }}>
            <div style={{
              flex: 1, borderRadius: "4px", padding: "3px 8px",
              background: "#4A4C2A",
              border: "2px solid #3a3c1a",
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.03)",
              maxHeight: "70px",
            }}>
              {/* Status indicators */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "9px", fontFamily: "Arial, sans-serif",
                height: "12px", padding: "0 2px",
              }}>
                <span style={{ fontWeight: 700, color: e.modifier === "f" ? "#F47B20" : e.modifier === "g" ? "#3FC0C0" : "transparent" }}>
                  {e.modifier === "f" ? "f" : e.modifier === "g" ? "g" : "."}
                </span>
                <span style={{ fontWeight: 700, color: "#ddd", fontSize: "8px", visibility: e.beginMode ? "visible" : "hidden" }}>BEGIN</span>
                <span style={{ fontWeight: 700, color: "#8a8a60", fontSize: "8px", visibility: e.stoMode ? "visible" : (e.rclMode ? "visible" : "hidden") }}>
                  {e.stoMode ? "STO" : "RCL"}
                </span>
              </div>
              {/* LCD digits */}
              <div style={{
                background: "#6B7040",
                borderRadius: "2px",
                padding: "4px 8px",
                textAlign: "right",
                border: "1px solid #555830",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}>
                <span style={{
                  fontFamily: "'DSEG7 Classic', 'DSEG7Classic', 'Courier New', monospace",
                  fontSize: "2.4rem",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "#C8D820",
                  letterSpacing: "6px",
                  lineHeight: 1,
                  textShadow: "0 0 10px rgba(200,216,32,0.5), 0 0 4px rgba(168,184,0,0.4)",
                  display: "block",
                }}>
                  {displayText}
                </span>
              </div>
            </div>
            {/* Info button */}
            <button onClick={() => setGlossary(true)} style={{
              width: "22px", flexShrink: 0, borderRadius: "4px", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              background: "#4A4C2A", border: "2px solid #3a3c1a",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
            }}>
              <Info style={{ width: "12px", height: "12px", color: "#8a8a60", opacity: 0.8 }} />
            </button>
          </div>

          {/* Dark separator strip */}
          <div style={{
            height: "2px", background: "linear-gradient(to right, transparent, #3a3018, #3a3018, transparent)",
            margin: "6px 0 4px",
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
              fontSize: "9px", fontFamily: "monospace", color: "#999",
              padding: "3px 8px 0",
            }}>
              <span>n={e.fin.n.toFixed(0)}</span>
              <span>i={e.fin.i.toFixed(2)}%</span>
              <span>PV={e.fin.pv.toFixed(0)}</span>
              <span>PMT={e.fin.pmt.toFixed(0)}</span>
              <span>FV={e.fin.fv.toFixed(0)}</span>
            </div>

            {/* Row 1 group labels */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "2px",
              padding: "1px 4px 0",
            }}>
              <GroupLabel text="AMORT" />
              <GroupLabel text="INT" />
              <GroupLabel text="NPV" />
              <GroupLabel text="RND" />
              <GroupLabel text="IRR" />
              <div /><div /><div /><div /><div />
            </div>

            <div style={gridStyle}>
              {/* ══ ROW 1 ══ */}
              <Btn label="n"   fLbl="" gLbl="12×"  onClick={() => e.handleFinKey("n")} />
              <Btn label="i"   fLbl="" gLbl="12÷"  onClick={() => e.handleFinKey("i")} />
              <Btn label="PV"  fLbl="" gLbl="CFo"  onClick={() => e.handleFinKey("pv")} />
              <Btn label="PMT" fLbl="" gLbl="CFj"  onClick={() => e.handleFinKey("pmt")} />
              <Btn label="FV"  fLbl="" gLbl="Nj"   onClick={() => e.handleFinKey("fv")} />
              <Btn label="CHS" fLbl="DATE"               onClick={() => e.op("CHS")} />
              <Btn label="7"                gLbl="BEG"   onClick={() => handleWithModifier(() => e.num("7"), undefined, () => e.toggleBeg(true))} />
              <Btn label="8"                gLbl="END"   onClick={() => handleWithModifier(() => e.num("8"), undefined, () => e.toggleBeg(false))} />
              <Btn label="9"                gLbl="MEM"   onClick={() => e.num("9")} />
              <Btn label="÷"                              onClick={() => e.op("÷")} />

              {/* Row 2 group labels inline */}
            </div>

            {/* Row 2 group labels */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "2px",
              padding: "1px 4px 0",
            }}>
              <BracketLabel text="BOND" span={2} />
              <BracketLabel text="DEPRECIATION" span={3} />
              <div /><div /><div /><div /><div />
            </div>

            <div style={gridStyle}>
              {/* ══ ROW 2 ══ */}
              <Btn label="Yˣ"  fLbl="" gLbl="√x"   onClick={() => handleWithModifier(() => e.op("yˣ"), undefined, () => e.op("√x"))} />
              <Btn label="1/x" fLbl="" gLbl="eˣ"   onClick={() => handleWithModifier(() => e.op("1/x"), undefined, () => e.op("eˣ"))} />
              <Btn label="%T"  fLbl="" gLbl="LN"   onClick={() => handleWithModifier(() => e.op("%T"), undefined, () => e.op("LN"))} />
              <Btn label="Δ%"  fLbl="" gLbl="FRAC" onClick={() => handleWithModifier(() => e.op("Δ%"), undefined, () => e.op("FRAC"))} />
              <Btn label="%"   fLbl="" gLbl="INTG" onClick={() => handleWithModifier(() => e.op("%"), undefined, () => e.op("INTG"))} />
              <Btn label="EEX" fLbl="ΔDYS"               onClick={() => {}} />
              <Btn label="4"                gLbl="D.MY"  onClick={() => handleWithModifier(() => e.num("4"), () => e.setFix(4))} />
              <Btn label="5"                gLbl="M.DY"  onClick={() => handleWithModifier(() => e.num("5"), () => e.setFix(5))} />
              <Btn label="6"                gLbl="x̄w"   onClick={() => handleWithModifier(() => e.num("6"), () => e.setFix(6))} />
              <Btn label="×"                              onClick={() => e.op("×")} />
            </div>

            {/* Row 3 group labels */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "2px",
              padding: "1px 4px 0",
            }}>
              <div /><div /><div />
              <BracketLabel text="CLEAR" span={2} />
              <div /><div /><div /><div /><div />
            </div>

            <div style={gridStyle}>
              {/* ══ ROW 3 ══ */}
              <Btn label="R/S" fLbl="P/R"   gLbl="PSE"  onClick={() => {}} />
              <Btn label="SST" fLbl="Σ"     gLbl="BST"  onClick={() => {}} />
              <Btn label="R↓"  fLbl="PRGM"  gLbl="GTO"  onClick={() => e.rollDown()} />
              <Btn label="x⇌y" fLbl="FIN"  gLbl="x≤y"  onClick={() => handleWithModifier(() => e.swapXY(), () => e.clearFin())} />
              <Btn label="CLx" fLbl="REG"   gLbl="x=0"  onClick={() => handleWithModifier(() => e.clx(), () => e.clearReg())} />
              {/* ENTER — spans rows 3 & 4 */}
              <Btn label="ENTER" fLbl="PREFIX" gLbl="LSTx" tall
                onClick={() => handleWithModifier(() => e.enter(), undefined, () => e.rclLastX())} />
              <Btn label="1"                gLbl="x̂,r"  onClick={() => handleWithModifier(() => e.num("1"), () => e.setFix(1), () => e.statStdDevX())} />
              <Btn label="2"                gLbl="ŷ,r"  onClick={() => handleWithModifier(() => e.num("2"), () => e.setFix(2), () => e.statStdDevY())} />
              <Btn label="3"                gLbl="n!"   onClick={() => handleWithModifier(() => e.num("3"), () => e.setFix(3), () => e.op("n!"))} />
              <Btn label="–"                              onClick={() => e.op("-")} />

              {/* ══ ROW 4 ══ */}
              <Btn label="ON"                             onClick={handleOnClick} />
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
              <Btn label="0"                gLbl="x̄"   onClick={() => handleWithModifier(() => e.num("0"), () => e.setFix(0), () => e.statMeanX())} />
              <Btn label="·"                gLbl="ȳ,r"    onClick={() => handleWithModifier(() => e.num("."), undefined, () => e.statMeanYX())} />
              <Btn label="Σ+"               gLbl="Σ−"  onClick={() => handleWithModifier(() => e.sigmaPlus(), undefined, () => e.sigmaMinus())} />
              <Btn label="+"                             onClick={() => e.op("+")} />
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
