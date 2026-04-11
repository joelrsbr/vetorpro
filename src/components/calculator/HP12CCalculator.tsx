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

  // HP 12c styled button
  const hp12cBtn = (
    label: string,
    onClick: () => void,
    variant: "black" | "beige" | "orange" | "blue" | "enter" = "black",
    topLabel?: string,
    bottomLabel?: string,
    colSpan?: number,
  ) => {
    const base = "relative flex flex-col items-center justify-center font-bold shadow-[0_2px_0_rgba(0,0,0,0.4)] active:shadow-[0_0px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] transition-all duration-75 select-none";
    
    const styles: Record<string, string> = {
      black: "bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-[#444] rounded-md h-10 text-xs",
      beige: "bg-[#c8b98a] hover:bg-[#d4c89a] text-[#2a2a2a] border border-[#a89868] rounded-md h-10 text-xs font-bold",
      orange: "bg-[#d4710a] hover:bg-[#e07b10] text-white border border-[#b05e08] rounded-md h-10 text-[11px] font-bold",
      blue: "bg-[#2665a8] hover:bg-[#3075b8] text-white border border-[#1d5590] rounded-md h-10 text-[11px] font-bold",
      enter: "bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-[#444] rounded-md h-10 text-xs",
    };

    return (
      <button
        className={cn(base, styles[variant], colSpan && `col-span-${colSpan}`)}
        style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}
        onClick={onClick}
      >
        {topLabel && (
          <span className="absolute -top-[14px] text-[8px] font-medium text-amber-500 leading-none whitespace-nowrap">
            {topLabel}
          </span>
        )}
        <span>{label}</span>
        {bottomLabel && (
          <span className="absolute -bottom-[13px] text-[7px] font-medium text-sky-400 leading-none whitespace-nowrap">
            {bottomLabel}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Calculator body — horizontal HP 12c style */}
      <div className="rounded-2xl p-1" style={{ background: "linear-gradient(145deg, #1a1610, #2c261e, #1a1610)" }}>
        <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #3a3428, #2a2418)" }}>
          
          {/* Top branding bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
              <span className="text-[10px] font-bold tracking-[0.3em] text-amber-200/60 uppercase">Hewlett-Packard</span>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-amber-200/40">12C</span>
          </div>
          
          {/* Display */}
          <div className="mx-3 mb-1">
            <div 
              className="rounded-lg p-3 font-mono text-right text-2xl shadow-inner border"
              style={{ 
                background: "linear-gradient(180deg, #b8c490, #a8b480)",
                borderColor: "#7a8060",
                color: "#1a1a1a",
              }}
            >
              {display}
            </div>
            {/* Financial register readouts */}
            <div className="flex justify-between text-[9px] mt-1.5 px-1 font-mono" style={{ color: "#a89868" }}>
              <span>n:{financialValues.n.toFixed(0)}</span>
              <span>i:{financialValues.i.toFixed(2)}%</span>
              <span>PV:{financialValues.pv.toFixed(0)}</span>
              <span>PMT:{financialValues.pmt.toFixed(0)}</span>
              <span>FV:{financialValues.fv.toFixed(0)}</span>
            </div>
          </div>

          {/* Button area */}
          <div className="px-3 pb-4 pt-3 space-y-5">
            
            {/* Row 1: Financial keys (top labels = orange functions) */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("n", () => handleFinancialStore("n"), "beige", "AMORT")}
              {hp12cBtn("i", () => handleFinancialStore("i"), "beige", "INT")}
              {hp12cBtn("PV", () => handleFinancialStore("pv"), "beige", "NPV")}
              {hp12cBtn("PMT", () => handleFinancialStore("pmt"), "beige", "RND")}
              {hp12cBtn("FV", () => handleFinancialStore("fv"), "beige", "IRR")}
            </div>

            {/* Row 2: Solve keys (orange) */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("→n", () => calculateFinancial("n"), "orange")}
              {hp12cBtn("→i", () => calculateFinancial("i"), "orange")}
              {hp12cBtn("→PV", () => calculateFinancial("pv"), "orange")}
              {hp12cBtn("→PMT", () => calculateFinancial("pmt"), "orange")}
              {hp12cBtn("→FV", () => calculateFinancial("fv"), "orange")}
            </div>

            {/* Row 3: Percentage / math functions (blue-labeled) */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("Δ%", () => handleOperator("Δ%"), "blue")}
              {hp12cBtn("%T", () => handleOperator("%T"), "blue")}
              {hp12cBtn("1/x", () => handleOperator("1/x"), "black", "", "e^x")}
              {hp12cBtn("√x", () => handleOperator("√x"), "black", "", "LN")}
              {hp12cBtn("yˣ", () => handleOperator("yˣ"), "black")}
            </div>

            {/* Row 4: 7 8 9 ÷ CLX */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("7", () => handleNumber("7"), "black")}
              {hp12cBtn("8", () => handleNumber("8"), "black")}
              {hp12cBtn("9", () => handleNumber("9"), "black")}
              {hp12cBtn("÷", () => handleOperator("÷"), "beige")}
              {hp12cBtn("CLX", handleClear, "beige")}
            </div>

            {/* Row 5: 4 5 6 × CLR */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("4", () => handleNumber("4"), "black")}
              {hp12cBtn("5", () => handleNumber("5"), "black")}
              {hp12cBtn("6", () => handleNumber("6"), "black")}
              {hp12cBtn("×", () => handleOperator("×"), "beige")}
              {hp12cBtn("CLR", handleClearAll, "beige")}
            </div>

            {/* Row 6: 1 2 3 − CHS */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("1", () => handleNumber("1"), "black")}
              {hp12cBtn("2", () => handleNumber("2"), "black")}
              {hp12cBtn("3", () => handleNumber("3"), "black")}
              {hp12cBtn("−", () => handleOperator("-"), "beige")}
              {hp12cBtn("CHS", () => handleOperator("CHS"), "black")}
            </div>

            {/* Row 7: 0 . ENTER + */}
            <div className="grid grid-cols-5 gap-1.5">
              {hp12cBtn("0", () => handleNumber("0"), "black")}
              {hp12cBtn(".", () => handleNumber("."), "black")}
              {hp12cBtn("ENTER", handleEnter, "beige", undefined, undefined, 2)}
              {hp12cBtn("+", () => handleOperator("+"), "beige")}
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
