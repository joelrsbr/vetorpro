import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type FinancialValues = {
  n: number;
  i: number;
  pv: number;
  pmt: number;
  fv: number;
};

export function HP12CCalculatorBody() {
  const [display, setDisplay] = useState("0.00");
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
    setDisplay("0.00");
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

  // Button component matching HP 12c real hardware exactly
  const Key = ({
    label,
    onClick,
    variant = "dark",
    fLabel,
    gLabel,
    wide,
    className: extraClass,
  }: {
    label: string;
    onClick: () => void;
    variant?: "dark" | "beige" | "orange" | "blue";
    fLabel?: string;
    gLabel?: string;
    wide?: boolean;
    className?: string;
  }) => {
    const styles = {
      dark: "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#444] shadow-[0_3px_0_#111,inset_0_1px_0_rgba(255,255,255,0.06)]",
      beige: "bg-[#c8bc9e] hover:bg-[#d4c8aa] text-[#1a1a1a] border-[#a89c80] shadow-[0_3px_0_#8a7e66,inset_0_1px_0_rgba(255,255,255,0.35)]",
      orange: "bg-[#d4760a] hover:bg-[#e0860f] text-white border-[#aa5e08] shadow-[0_3px_0_#7a4406,inset_0_1px_0_rgba(255,255,255,0.12)]",
      blue: "bg-[#2874a6] hover:bg-[#3085b7] text-white border-[#1c5a82] shadow-[0_3px_0_#134060,inset_0_1px_0_rgba(255,255,255,0.12)]",
    };

    return (
      <div className={cn("flex flex-col items-center gap-0", wide ? "col-span-2" : "")}>
        {/* f-label (orange) above */}
        <span className={cn("text-[7px] font-bold leading-none h-[11px] whitespace-nowrap", fLabel ? "text-[#d4760a]" : "invisible")}>
          {fLabel || "."}
        </span>
        <button
          className={cn(
            "w-full font-bold select-none transition-all duration-50 active:translate-y-[2px] active:shadow-none border rounded-[3px]",
            "h-[34px] text-[11px] min-w-0",
            styles[variant],
            extraClass,
          )}
          onClick={onClick}
        >
          {label}
        </button>
        {/* g-label (blue) below */}
        <span className={cn("text-[6.5px] font-bold leading-none h-[10px] whitespace-nowrap", gLabel ? "text-[#2874a6]" : "invisible")}>
          {gLabel || "."}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[540px] mx-auto select-none">
      {/* Outer beige shell */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#c8b98a", padding: "12px 10px 6px" }}>
        
        {/* LCD Display — greenish with digital font */}
        <div
          className="rounded-md mx-auto mb-3 px-5 py-4 text-right font-mono text-3xl tracking-[3px] border"
          style={{
            background: "linear-gradient(180deg, #c5cca0, #b0b888)",
            borderColor: "#8a9060",
            color: "#1a1e10",
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            textShadow: "0 0 2px rgba(0,0,0,0.15)",
            maxWidth: "320px",
          }}
        >
          {display}
        </div>

        {/* Dark body with keys */}
        <div className="rounded-lg p-3 pt-2" style={{ background: "linear-gradient(180deg, #3a3630, #2e2a24, #262220)" }}>
          
          {/* Financial register readout */}
          <div className="flex justify-between text-[8px] mb-2 px-1 font-mono text-amber-400/70">
            <span>n={financialValues.n.toFixed(0)}</span>
            <span>i={financialValues.i.toFixed(2)}%</span>
            <span>PV={financialValues.pv.toFixed(0)}</span>
            <span>PMT={financialValues.pmt.toFixed(0)}</span>
            <span>FV={financialValues.fv.toFixed(0)}</span>
          </div>

          {/* Key grid — 10 columns, 4 rows — matching real HP 12c */}
          <div className="grid grid-cols-10 gap-x-[3px] gap-y-[1px]">

            {/* ─── Row 1: n i PV PMT FV │ CHS 7 8 9 ÷ ─── */}
            <Key label="n" onClick={() => handleFinancialStore("n")} variant="beige" fLabel="AMORT" gLabel="12×" />
            <Key label="i" onClick={() => handleFinancialStore("i")} variant="beige" fLabel="INT" gLabel="12÷" />
            <Key label="PV" onClick={() => handleFinancialStore("pv")} variant="beige" fLabel="NPV" gLabel="CFo" />
            <Key label="PMT" onClick={() => handleFinancialStore("pmt")} variant="beige" fLabel="RND" gLabel="CFj" />
            <Key label="FV" onClick={() => handleFinancialStore("fv")} variant="beige" fLabel="IRR" gLabel="Nj" />
            <Key label="CHS" onClick={() => handleOperator("CHS")} variant="dark" fLabel="DATE" />
            <Key label="7" onClick={() => handleNumber("7")} variant="dark" gLabel="BEG" />
            <Key label="8" onClick={() => handleNumber("8")} variant="dark" gLabel="END" />
            <Key label="9" onClick={() => handleNumber("9")} variant="dark" gLabel="MEM" />
            <Key label="÷" onClick={() => handleOperator("÷")} variant="dark" />

            {/* ─── Row 2: yˣ 1/x %T Δ% % │ EEX 4 5 6 × ─── */}
            <Key label="yˣ" onClick={() => handleOperator("yˣ")} variant="beige" fLabel="PRICE" gLabel="√x" />
            <Key label="1/x" onClick={() => handleOperator("1/x")} variant="beige" fLabel="YTM" gLabel="eˣ" />
            <Key label="%T" onClick={() => handleOperator("%T")} variant="beige" fLabel="SL" gLabel="LN" />
            <Key label="Δ%" onClick={() => handleOperator("Δ%")} variant="beige" fLabel="SOYD" gLabel="FRAC" />
            <Key label="%" onClick={() => handleOperator("%T")} variant="beige" fLabel="DB" gLabel="INTG" />
            <Key label="EEX" onClick={() => handleNumber("e")} variant="dark" fLabel="ΔDYS" />
            <Key label="4" onClick={() => handleNumber("4")} variant="dark" gLabel="D.MY" />
            <Key label="5" onClick={() => handleNumber("5")} variant="dark" gLabel="M.DY" />
            <Key label="6" onClick={() => handleNumber("6")} variant="dark" gLabel="x̄w" />
            <Key label="×" onClick={() => handleOperator("×")} variant="dark" />

            {/* ─── Row 3: R/S SST R↓ x⇌y CLx │ ENTER(2col) 1 2 3 − ─── */}
            <Key label="R/S" onClick={() => {}} variant="beige" fLabel="P/R" gLabel="PSE" />
            <Key label="SST" onClick={() => {}} variant="beige" fLabel="Σ" gLabel="BST" />
            <Key label="R↓" onClick={() => {}} variant="beige" fLabel="PRGM" gLabel="GTO" />
            <Key label="x⇌y" onClick={() => {
              const x = parseFloat(display);
              setDisplay(stack[0].toString());
              setStack(prev => [x, prev[1], prev[2], prev[3]]);
              setIsNewEntry(true);
            }} variant="beige" fLabel="FIN" gLabel="x≤y" />
            <Key label="CLx" onClick={handleClear} variant="beige" fLabel="REG" gLabel="x=0" />

            {/* ENTER — spans 2 cols */}
            <div className="col-span-2 flex flex-col items-center gap-0">
              <span className="text-[7px] font-bold leading-none h-[11px] text-[#d4760a]">PREFIX</span>
              <button
                className="w-full bg-[#c8bc9e] hover:bg-[#d4c8aa] text-[#1a1a1a] border border-[#a89c80] rounded-[3px] h-[34px] text-[8px] font-bold shadow-[0_3px_0_#8a7e66,inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-[2px] active:shadow-none flex flex-col items-center justify-center leading-[1] tracking-wider"
                onClick={handleEnter}
              >
                E N T E R
              </button>
              <span className="text-[6.5px] font-bold leading-none h-[10px] text-[#2874a6]">LSTx</span>
            </div>

            <Key label="1" onClick={() => handleNumber("1")} variant="dark" gLabel="x̂,r" />
            <Key label="2" onClick={() => handleNumber("2")} variant="dark" gLabel="ŷ,r" />
            <Key label="3" onClick={() => handleNumber("3")} variant="dark" gLabel="n!" />
            <Key label="−" onClick={() => handleOperator("-")} variant="dark" />

            {/* ─── Row 4: ON f g STO RCL │ (spacer) 0 . Σ+ + ─── */}
            <Key label="ON" onClick={handleClearAll} variant="dark" />
            {/* f key — orange */}
            <div className="flex flex-col items-center gap-0">
              <span className="text-[7px] font-bold leading-none h-[11px] invisible">.</span>
              <button
                className="w-full bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[34px] text-[11px] font-bold shadow-[0_3px_0_#7a4406,inset_0_1px_0_rgba(255,255,255,0.12)] active:translate-y-[2px] active:shadow-none"
                onClick={() => {}}
              >
                f
              </button>
              <span className="text-[6.5px] font-bold leading-none h-[10px] invisible">.</span>
            </div>
            {/* g key — blue */}
            <div className="flex flex-col items-center gap-0">
              <span className="text-[7px] font-bold leading-none h-[11px] invisible">.</span>
              <button
                className="w-full bg-[#2874a6] hover:bg-[#3085b7] text-white border border-[#1c5a82] rounded-[3px] h-[34px] text-[11px] font-bold shadow-[0_3px_0_#134060,inset_0_1px_0_rgba(255,255,255,0.12)] active:translate-y-[2px] active:shadow-none"
                onClick={() => {}}
              >
                g
              </button>
              <span className="text-[6.5px] font-bold leading-none h-[10px] invisible">.</span>
            </div>
            <Key label="STO" onClick={() => {}} variant="beige" />
            <Key label="RCL" onClick={() => {}} variant="beige" />

            {/* spacer for col 6 — occupied by 0 below in original but we keep grid aligned */}
            <div className="flex flex-col items-center gap-0">
              <span className="text-[7px] font-bold leading-none h-[11px] invisible">.</span>
              <span className="h-[34px]" />
              <span className="text-[6.5px] font-bold leading-none h-[10px] invisible">.</span>
            </div>

            <Key label="0" onClick={() => handleNumber("0")} variant="dark" gLabel="x̄" />
            <Key label="." onClick={() => handleNumber(".")} variant="dark" gLabel="s" />
            <Key label="Σ+" onClick={() => {}} variant="dark" gLabel="Σ−" />
            <Key label="+" onClick={() => handleOperator("+")} variant="dark" />
          </div>

          {/* ─── Solve row — orange buttons ─── */}
          <div className="grid grid-cols-5 gap-1 mt-3">
            <button className="bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[28px] text-[9px] font-bold shadow-[0_2px_0_#7a4406] active:translate-y-[1px] active:shadow-none" onClick={() => calculateFinancial("n")}>→n</button>
            <button className="bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[28px] text-[9px] font-bold shadow-[0_2px_0_#7a4406] active:translate-y-[1px] active:shadow-none" onClick={() => calculateFinancial("i")}>→i</button>
            <button className="bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[28px] text-[9px] font-bold shadow-[0_2px_0_#7a4406] active:translate-y-[1px] active:shadow-none" onClick={() => calculateFinancial("pv")}>→PV</button>
            <button className="bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[28px] text-[9px] font-bold shadow-[0_2px_0_#7a4406] active:translate-y-[1px] active:shadow-none" onClick={() => calculateFinancial("pmt")}>→PMT</button>
            <button className="bg-[#d4760a] hover:bg-[#e0860f] text-white border border-[#aa5e08] rounded-[3px] h-[28px] text-[9px] font-bold shadow-[0_2px_0_#7a4406] active:translate-y-[1px] active:shadow-none" onClick={() => calculateFinancial("fv")}>→FV</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy wrapper with Drawer
export function HP12CCalculator() {
  return null;
}
