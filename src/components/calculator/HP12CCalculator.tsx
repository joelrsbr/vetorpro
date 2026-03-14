import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function HP12CCalculator() {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(0);
  const [stack, setStack] = useState<number[]>([0, 0, 0, 0]); // Y, Z, T, Last X
  const [financialValues, setFinancialValues] = useState<FinancialValues>({
    n: 0,
    i: 0,
    pv: 0,
    pmt: 0,
    fv: 0,
  });
  const [isNewEntry, setIsNewEntry] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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
      case "+":
        result = y + x;
        break;
      case "-":
        result = y - x;
        break;
      case "×":
        result = y * x;
        break;
      case "÷":
        result = x !== 0 ? y / x : 0;
        break;
      case "Δ%":
        result = x !== 0 ? ((y - x) / x) * 100 : 0;
        break;
      case "%T":
        result = y !== 0 ? (x / y) * 100 : 0;
        break;
      case "yˣ":
        result = Math.pow(y, x);
        break;
      case "1/x":
        result = x !== 0 ? 1 / x : 0;
        break;
      case "√x":
        result = Math.sqrt(x);
        break;
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
          // n = ln((PMT - FV*i) / (PMT + PV*i)) / ln(1+i)
          if (rate !== 0 && pmt !== 0) {
            result = Math.log((pmt - fv * rate) / (pmt + pv * rate)) / Math.log(1 + rate);
          }
          break;
        case "i":
          // Iterative solution needed - simplified approximation
          result = ((-pmt * n - fv - pv) / (pv * n)) * 100;
          break;
        case "pv":
          // PV = -PMT * (1 - (1+i)^-n) / i - FV * (1+i)^-n
          if (rate !== 0) {
            result = -pmt * (1 - Math.pow(1 + rate, -n)) / rate - fv * Math.pow(1 + rate, -n);
          }
          break;
        case "pmt":
          // PMT = (PV * i * (1+i)^n) / ((1+i)^n - 1)
          if (rate !== 0 && n > 0) {
            const factor = Math.pow(1 + rate, n);
            result = -(pv * rate * factor) / (factor - 1) - (fv * rate) / (factor - 1);
          }
          break;
        case "fv":
          // FV = -PV*(1+i)^n - PMT*((1+i)^n - 1)/i
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

  const hp12cButton = (
    label: string,
    onClick: () => void,
    variant: "number" | "operator" | "financial" | "enter" | "clear" = "number"
  ) => {
    const baseClasses = "h-10 text-sm font-semibold shadow-md active:translate-y-0.5 transition-transform";
    const variantClasses = {
      number: "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600",
      operator: "bg-amber-600 hover:bg-amber-500 text-white border-amber-500",
      financial: "bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-600 text-xs",
      enter: "bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600",
      clear: "bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-600",
    };

    return (
      <Button
        variant="outline"
        className={cn(baseClasses, variantClasses[variant])}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  };

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
          <Card className="bg-gradient-to-b from-neutral-800 to-neutral-900 border-neutral-700 w-full max-w-xs">
            <CardHeader className="py-3 px-3">
              <CardTitle className="sr-only">HP 12C</CardTitle>
              {/* Display */}
              <div className="bg-[#c8d4a2] rounded-lg p-3 font-mono text-right text-2xl text-neutral-800 shadow-inner border-2 border-neutral-600">
                {display}
              </div>
              {/* Financial Register Indicators */}
              <div className="flex justify-between text-[10px] text-amber-400/70 mt-2 px-0.5">
                <span>n:{financialValues.n.toFixed(0)}</span>
                <span>i:{financialValues.i.toFixed(2)}%</span>
                <span>PV:{financialValues.pv.toFixed(0)}</span>
                <span>PMT:{financialValues.pmt.toFixed(0)}</span>
                <span>FV:{financialValues.fv.toFixed(0)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-3">
              {/* Financial Keys Row */}
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("n", () => handleFinancialStore("n"), "financial")}
                {hp12cButton("i", () => handleFinancialStore("i"), "financial")}
                {hp12cButton("PV", () => handleFinancialStore("pv"), "financial")}
                {hp12cButton("PMT", () => handleFinancialStore("pmt"), "financial")}
                {hp12cButton("FV", () => handleFinancialStore("fv"), "financial")}
              </div>
              
              {/* Solve Keys Row */}
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("→n", () => calculateFinancial("n"), "operator")}
                {hp12cButton("→i", () => calculateFinancial("i"), "operator")}
                {hp12cButton("→PV", () => calculateFinancial("pv"), "operator")}
                {hp12cButton("→PMT", () => calculateFinancial("pmt"), "operator")}
                {hp12cButton("→FV", () => calculateFinancial("fv"), "operator")}
              </div>
              
              {/* Function Keys */}
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("Δ%", () => handleOperator("Δ%"), "financial")}
                {hp12cButton("%T", () => handleOperator("%T"), "financial")}
                {hp12cButton("1/x", () => handleOperator("1/x"), "financial")}
                {hp12cButton("√x", () => handleOperator("√x"), "financial")}
                {hp12cButton("yˣ", () => handleOperator("yˣ"), "financial")}
              </div>
              
              {/* Number Pad */}
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("7", () => handleNumber("7"))}
                {hp12cButton("8", () => handleNumber("8"))}
                {hp12cButton("9", () => handleNumber("9"))}
                {hp12cButton("÷", () => handleOperator("÷"), "operator")}
                {hp12cButton("CLX", handleClear, "clear")}
              </div>
              
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("4", () => handleNumber("4"))}
                {hp12cButton("5", () => handleNumber("5"))}
                {hp12cButton("6", () => handleNumber("6"))}
                {hp12cButton("×", () => handleOperator("×"), "operator")}
                {hp12cButton("CLR", handleClearAll, "clear")}
              </div>
              
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("1", () => handleNumber("1"))}
                {hp12cButton("2", () => handleNumber("2"))}
                {hp12cButton("3", () => handleNumber("3"))}
                {hp12cButton("-", () => handleOperator("-"), "operator")}
                {hp12cButton("CHS", () => handleOperator("CHS"), "financial")}
              </div>
              
              <div className="grid grid-cols-5 gap-1">
                {hp12cButton("0", () => handleNumber("0"))}
                {hp12cButton(".", () => handleNumber("."))}
                <Button
                  variant="outline"
                  className="h-10 text-sm font-semibold bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600 col-span-1 shadow-md active:translate-y-0.5 transition-transform"
                  onClick={handleEnter}
                >
                  ENT
                </Button>
                {hp12cButton("+", () => handleOperator("+"), "operator")}
                <div />
              </div>
            </CardContent>
          </Card>
          
          {/* Instructions */}
          <div className="mt-3 text-center text-xs text-muted-foreground max-w-xs">
            <p className="mb-1"><strong>Como usar:</strong></p>
            <p>Digite valores e pressione as teclas (n, i, PV, PMT, FV) para armazenar.</p>
            <p>Pressione →[tecla] para calcular o valor desejado.</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
