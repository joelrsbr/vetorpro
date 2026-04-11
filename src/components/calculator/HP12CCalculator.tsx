import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Calculator, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FinancialValues = {
  n: number;
  i: number;
  pv: number;
  pmt: number;
  fv: number;
};

export function HP12CCalculatorBody() {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(0);
  const [stack, setStack] = useState<number[]>([0, 0, 0, 0]);
  const [financialValues, setFinancialValues] = useState<FinancialValues>({
    n: 0, i: 0, pv: 0, pmt: 0, fv: 0,
  });
  const [isNewEntry, setIsNewEntry] = useState(true);

  const pushStack = useCallback((value: number) => {
    setStack((prev) => [value, prev[0], prev[1], prev[2]]);
  }, []);

  const handleNumber = (num: string) => {
    if (isNewEntry) {
      setDisplay(num === "." ? "0." : num);
      setIsNewEntry(false);
    } else {
      if (num === "." && display.includes(".")) return;
      setDisplay(display + num);
    }
  };

  const handleEnter = () => {
    const value = parseFloat(display);
    pushStack(value);
    setIsNewEntry(true);
  };

  const handleClear = () => {
    setDisplay("0");
    setIsNewEntry(true);
  };

  const handleClearAll = () => {
    setDisplay("0");
    setStack([0, 0, 0, 0]);
    setFinancialValues({ n: 0, i: 0, pv: 0, pmt: 0, fv: 0 });
    setMemory(0);
    setIsNewEntry(true);
  };

  const handleOperator = (op: string) => {
    const x = parseFloat(display);
    const y = stack[0];
    let result = 0;

    switch (op) {
      case "+": result = y + x; break;
      case "-": result = y - x; break;
      case "×": result = y * x; break;
      case "÷": result = x !== 0 ? y / x : 0; break;
      case "Δ%": result = x !== 0 ? ((y - x) / x) * 100 : 0; break;
      case "%T": result = y !== 0 ? (x / y) * 100 : 0; break;
      case "yˣ": result = Math.pow(y, x); break;
      case "1/x": result = x !== 0 ? 1 / x : 0; break;
      case "√x": result = Math.sqrt(x); break;
      case "CHS":
        result = -x;
        setDisplay(result.toString());
        return;
    }

    setStack((prev) => [prev[1], prev[2], prev[3], x]);
    setDisplay(result.toFixed(6).replace(/\.?0+$/, ""));
    setIsNewEntry(true);
  };

  const handleFinancialStore = (key: keyof FinancialValues) => {
    const value = parseFloat(display);
    setFinancialValues((prev) => ({ ...prev, [key]: value }));
    handleEnter();
  };

  const handleFinancialRecall = (key: keyof FinancialValues) => {
    setDisplay(financialValues[key].toString());
    setIsNewEntry(true);
  };

  const calculateFinancial = (solveFor: keyof FinancialValues) => {
    const { n, i, pv, pmt, fv } = financialValues;
    const rate = i / 100;
    let result = 0;

    try {
      switch (solveFor) {
        case "n":
          if (rate !== 0 && pmt !== 0) {
            result = Math.log((pmt - fv * rate) / (pmt + pv * rate)) / Math.log(1 + rate);
          }
          break;
        case "i":
          result = ((-pmt * n - fv - pv) / (pv * n)) * 100;
          break;
        case "pv":
          if (rate !== 0) {
            result = -pmt * (1 - Math.pow(1 + rate, -n)) / rate - fv * Math.pow(1 + rate, -n);
          }
          break;
        case "pmt":
          if (rate !== 0 && n > 0) {
            const factor = Math.pow(1 + rate, n);
            result = -(pv * rate * factor) / (factor - 1) - (fv * rate) / (factor - 1);
          }
          break;
        case "fv":
          if (rate !== 0) {
            const factor = Math.pow(1 + rate, n);
            result = -pv * factor - pmt * (factor - 1) / rate;
          }
          break;
      }

      setFinancialValues((prev) => ({ ...prev, [solveFor]: result }));
      setDisplay(result.toFixed(2));
      setIsNewEntry(true);
    } catch {
      setDisplay("Error");
      setIsNewEntry(true);
    }
  };

  // Button renderer matching HP 12c real hardware
  const btn = (
    label: string,
    onClick: () => void,
    variant: "white" | "beige" | "orange" | "blue" | "black" | "on" = "white",
    fLabel?: string,  // orange f-function label (top)
    gLabel?: string,  // blue g-function label (bottom)
    wide?: boolean,
  ) => {
    const base = "relative flex flex-col items-center justify-center font-bold transition-all duration-75 select-none active:brightness-90 active:translate-y-[1px]";
    
    const styles: Record<string, string> = {
      white: "bg-[#d4cbb3] hover:bg-[#ded5bd] text-[#1a1a1a] border border-[#b0a78f] rounded h-[38px] text-[11px] shadow-[0_2px_0_#8a8272,inset_0_1px_0_rgba(255,255,255,0.4)]",
      beige: "bg-[#d4cbb3] hover:bg-[#ded5bd] text-[#1a1a1a] border border-[#b0a78f] rounded h-[38px] text-[11px] shadow-[0_2px_0_#8a8272,inset_0_1px_0_rgba(255,255,255,0.4)]",
      orange: "bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[38px] text-[10px] shadow-[0_2px_0_#7a4510,inset_0_1px_0_rgba(255,255,255,0.15)]",
      blue: "bg-[#1a5c9c] hover:bg-[#2268a8] text-white border border-[#0e4a80] rounded h-[38px] text-[10px] shadow-[0_2px_0_#0e3a68,inset_0_1px_0_rgba(255,255,255,0.15)]",
      black: "bg-[#1e1e1e] hover:bg-[#2e2e2e] text-white border border-[#333] rounded h-[38px] text-[12px] shadow-[0_2px_0_#000,inset_0_1px_0_rgba(255,255,255,0.08)]",
      on: "bg-[#1e1e1e] hover:bg-[#2e2e2e] text-white border border-[#333] rounded h-[38px] text-[10px] shadow-[0_2px_0_#000,inset_0_1px_0_rgba(255,255,255,0.08)]",
    };

    return (
      <div className={cn("flex flex-col items-center", wide ? "col-span-2" : "")}>
        {/* f-label (orange) above button */}
        {fLabel ? (
          <span className="text-[8px] font-semibold text-[#c26a14] leading-none mb-1 h-[10px] whitespace-nowrap">{fLabel}</span>
        ) : (
          <span className="h-[10px] mb-1" />
        )}
        <button className={cn(base, styles[variant], wide ? "w-full" : "w-full")} onClick={onClick}>
          <span>{label}</span>
        </button>
        {/* g-label (blue) below button */}
        {gLabel ? (
          <span className="text-[7px] font-semibold text-[#1a5c9c] leading-none mt-1 h-[9px] whitespace-nowrap">{gLabel}</span>
        ) : (
          <span className="h-[9px] mt-1" />
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Calculator body */}
      <div className="rounded-2xl p-[3px]" style={{ background: "linear-gradient(145deg, #2a2520, #1a1610, #2a2520)" }}>
        <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #3a3428, #2e2820)" }}>
          
          {/* Top branding */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-500/50" />
              <span className="text-[9px] font-bold tracking-[0.25em] text-amber-200/50 uppercase">Hewlett-Packard</span>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-amber-200/30">12C</span>
          </div>
          
          {/* LCD Display */}
          <div className="mx-3 mb-2">
            <div 
              className="rounded-lg px-4 py-3 font-mono text-right text-2xl shadow-inner border"
              style={{ 
                background: "linear-gradient(180deg, #bcc898, #a8b480)",
                borderColor: "#7a8060",
                color: "#1a1a1a",
                fontFamily: "'Courier New', monospace",
                letterSpacing: "2px",
              }}
            >
              {display}
            </div>
            {/* Financial register readout */}
            <div className="flex justify-between text-[8px] mt-1 px-1 font-mono" style={{ color: "#8a7e60" }}>
              <span>n:{financialValues.n.toFixed(0)}</span>
              <span>i:{financialValues.i.toFixed(2)}%</span>
              <span>PV:{financialValues.pv.toFixed(0)}</span>
              <span>PMT:{financialValues.pmt.toFixed(0)}</span>
              <span>FV:{financialValues.fv.toFixed(0)}</span>
            </div>
          </div>

          {/* Buttons area — 10-column grid matching real HP 12c */}
          <div className="px-3 pb-4 pt-2">
            <div className="grid grid-cols-10 gap-x-1 gap-y-0">

              {/* Row 1: n  i  PV  PMT  FV  |  CHS  7  8  9  ÷ */}
              {btn("n", () => handleFinancialStore("n"), "beige", "AMORT", "12×")}
              {btn("i", () => handleFinancialStore("i"), "beige", "INT", "12÷")}
              {btn("PV", () => handleFinancialStore("pv"), "beige", "NPV", "CF₀")}
              {btn("PMT", () => handleFinancialStore("pmt"), "beige", "RND", "CFⱼ")}
              {btn("FV", () => handleFinancialStore("fv"), "beige", "IRR", "Nⱼ")}
              {btn("CHS", () => handleOperator("CHS"), "beige", undefined, undefined)}
              {btn("7", () => handleNumber("7"), "white", undefined, "BEG")}
              {btn("8", () => handleNumber("8"), "white", undefined, "END")}
              {btn("9", () => handleNumber("9"), "white", undefined, "MEM")}
              {btn("÷", () => handleOperator("÷"), "beige")}

              {/* Row 2: yˣ  1/x  %T  Δ%  %  |  EEX  4  5  6  × */}
              {btn("yˣ", () => handleOperator("yˣ"), "beige", "PRICE", "√x")}
              {btn("1/x", () => handleOperator("1/x"), "beige", "YTM", "eˣ")}
              {btn("%T", () => handleOperator("%T"), "beige", "SL", "LN")}
              {btn("Δ%", () => handleOperator("Δ%"), "beige", "SOYD", "FRAC")}
              {btn("%", () => handleOperator("%T"), "beige", "DB", "INTG")}
              {btn("EEX", () => handleNumber("e"), "beige", undefined, "ΔDYS")}
              {btn("4", () => handleNumber("4"), "white", undefined, "D.MY")}
              {btn("5", () => handleNumber("5"), "white", undefined, "M.DY")}
              {btn("6", () => handleNumber("6"), "white", undefined, "x̄w")}
              {btn("×", () => handleOperator("×"), "beige")}

              {/* Row 3: R/S  SST  R↓  x⇌y  CLx  |  ENTER (2-wide)  1  2  3  − */}
              {btn("R/S", () => {}, "beige", "P/R", "PSE")}
              {btn("SST", () => {}, "beige", "Σ", "BST")}
              {btn("R↓", () => {}, "beige", "PRGM", "GTO")}
              {btn("x⇌y", () => {
                const x = parseFloat(display);
                setDisplay(stack[0].toString());
                setStack(prev => [x, prev[1], prev[2], prev[3]]);
                setIsNewEntry(true);
              }, "beige", "FIN", "x≤y")}
              {btn("CLx", handleClear, "beige", "REG", "x=0")}
              {/* ENTER key — spans 2 cols */}
              <div className="col-span-2 flex flex-col items-center">
                <span className="h-[10px] mb-1 text-[8px] font-semibold text-[#c26a14] leading-none">PREFIX</span>
                <button
                  className="w-full bg-[#d4cbb3] hover:bg-[#ded5bd] text-[#1a1a1a] border border-[#b0a78f] rounded h-[38px] text-[10px] font-bold shadow-[0_2px_0_#8a8272,inset_0_1px_0_rgba(255,255,255,0.4)] active:brightness-90 active:translate-y-[1px] flex flex-col items-center justify-center leading-[1]"
                  onClick={handleEnter}
                >
                  <span className="text-[8px] leading-none">E</span>
                  <span className="text-[8px] leading-none">N</span>
                  <span className="text-[8px] leading-none">T</span>
                  <span className="text-[8px] leading-none">E</span>
                  <span className="text-[8px] leading-none">R</span>
                </button>
                <span className="h-[9px] mt-1 text-[7px] font-semibold text-[#1a5c9c] leading-none">LSTx</span>
              </div>
              {btn("1", () => handleNumber("1"), "white", undefined, "x̂,r")}
              {btn("2", () => handleNumber("2"), "white", undefined, "ŷ,r")}
              {btn("3", () => handleNumber("3"), "white", undefined, "n!")}
              {btn("−", () => handleOperator("-"), "beige")}

              {/* Row 4: ON  f  g  STO  RCL  |  (empty)  0  .  Σ+  + */}
              {btn("ON", handleClearAll, "on")}
              <div className="flex flex-col items-center">
                <span className="h-[10px] mb-1" />
                <button className="w-full bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[38px] text-[10px] font-bold shadow-[0_2px_0_#7a4510,inset_0_1px_0_rgba(255,255,255,0.15)] active:brightness-90 active:translate-y-[1px]" onClick={() => {}}>
                  f
                </button>
                <span className="h-[9px] mt-1" />
              </div>
              <div className="flex flex-col items-center">
                <span className="h-[10px] mb-1" />
                <button className="w-full bg-[#1a5c9c] hover:bg-[#2268a8] text-white border border-[#0e4a80] rounded h-[38px] text-[10px] font-bold shadow-[0_2px_0_#0e3a68,inset_0_1px_0_rgba(255,255,255,0.15)] active:brightness-90 active:translate-y-[1px]" onClick={() => {}}>
                  g
                </button>
                <span className="h-[9px] mt-1" />
              </div>
              {btn("STO", () => {}, "beige")}
              {btn("RCL", () => {}, "beige")}
              {/* Solve row (orange) — displayed as small secondary label row */}
              <div className="flex flex-col items-center">
                <span className="h-[10px] mb-1" />
                <button
                  className="w-full bg-[#d4cbb3] hover:bg-[#ded5bd] text-[#1a1a1a] border border-[#b0a78f] rounded h-[38px] text-[12px] font-bold shadow-[0_2px_0_#8a8272,inset_0_1px_0_rgba(255,255,255,0.4)] active:brightness-90 active:translate-y-[1px]"
                  onClick={() => handleNumber("0")}
                >
                  0
                </button>
                <span className="h-[9px] mt-1 text-[7px] font-semibold text-[#1a5c9c] leading-none">x̄</span>
              </div>
              {btn(".", () => handleNumber("."), "white", undefined, "s")}
              {btn("Σ+", () => {}, "beige", undefined, "Σ−")}
              {btn("+", () => handleOperator("+"), "beige")}
            </div>

            {/* Solve row — orange buttons for financial solving */}
            <div className="grid grid-cols-5 gap-1 mt-3 px-0">
              <button className="bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[30px] text-[9px] font-bold shadow-[0_1px_0_#7a4510] active:brightness-90 active:translate-y-[1px]" onClick={() => calculateFinancial("n")}>→n</button>
              <button className="bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[30px] text-[9px] font-bold shadow-[0_1px_0_#7a4510] active:brightness-90 active:translate-y-[1px]" onClick={() => calculateFinancial("i")}>→i</button>
              <button className="bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[30px] text-[9px] font-bold shadow-[0_1px_0_#7a4510] active:brightness-90 active:translate-y-[1px]" onClick={() => calculateFinancial("pv")}>→PV</button>
              <button className="bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[30px] text-[9px] font-bold shadow-[0_1px_0_#7a4510] active:brightness-90 active:translate-y-[1px]" onClick={() => calculateFinancial("pmt")}>→PMT</button>
              <button className="bg-[#c26a14] hover:bg-[#d47a20] text-white border border-[#9a5510] rounded h-[30px] text-[9px] font-bold shadow-[0_1px_0_#7a4510] active:brightness-90 active:translate-y-[1px]" onClick={() => calculateFinancial("fv")}>→FV</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy wrapper with Drawer for use in other contexts
export function HP12CCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button
          className="text-xs font-semibold border border-warning/40 rounded-md px-2 py-0.5 text-warning bg-warning/5 hover:bg-warning/15 hover:border-warning/60 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
          title="Calculadora HP12C"
        >
          HP-12C
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <div className="relative">
          <DrawerClose className="absolute right-4 top-2 z-10">
            <X className="h-5 w-5" />
          </DrawerClose>
        </div>
        <DrawerHeader className="text-center pb-1 pt-2 px-4">
          <DrawerTitle className="flex items-center justify-center gap-2 text-amber-700">
            <Calculator className="h-5 w-5" />
            HP 12C - Calculadora Financeira
          </DrawerTitle>
          <DrawerDescription className="text-center">
            Calculadora financeira profissional
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-5 overflow-y-auto flex flex-col items-center">
          <HP12CCalculatorBody />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
