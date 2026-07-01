"use client";

import { useMemo, useState } from "react";

const keypad = [
  ["C", "+/-", "%", "/"],
  ["7", "8", "9", "*"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", ".", "DEL", "="],
];

const evaluateExpression = (input: string): string => {
  const sanitized = input.replace(/[^0-9+\-*/().% ]/g, "");
  if (!sanitized.trim()) {
    return "0";
  }

  try {
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
      return "Error";
    }
    return Number.isInteger(result) ? String(result) : result.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  } catch {
    return "Error";
  }
};

export const CalculatorApp = () => {
  const [expression, setExpression] = useState("0");

  const preview = useMemo(() => evaluateExpression(expression), [expression]);

  const pushValue = (value: string) => {
    setExpression((current) => {
      if (value === "C") {
        return "0";
      }
      if (value === "DEL") {
        if (current.length <= 1) {
          return "0";
        }
        return current.slice(0, -1);
      }
      if (value === "=") {
        return preview;
      }
      if (value === "+/-") {
        return current === "0" ? current : current.startsWith("-") ? current.slice(1) : `-${current}`;
      }
      if (value === "%") {
        return current === "0" ? current : `(${current})/100`;
      }
      if (current === "0" && /[0-9.]/.test(value)) {
        return value;
      }
      return `${current}${value}`;
    });
  };

  return (
    <div className="ui-glass flex h-full flex-col rounded-b-2xl border-0 p-4 text-[var(--text-primary)]">
      <div className="rounded-[28px] border border-white/10 bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="text-right text-xs uppercase tracking-[0.32em] text-white/45">Calculator</div>
        <div className="mt-4 min-h-10 break-all text-right text-lg text-white/55">{expression}</div>
        <div className="mt-1 min-h-14 break-all text-right text-4xl font-semibold text-white">{preview}</div>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-4 gap-3">
        {keypad.flat().map((key) => {
          const accent =
            key === "="
              ? "bg-orange-400 text-slate-950"
              : ["+", "-", "*", "/", "%"].includes(key)
                ? "bg-white/16 text-white"
                : "bg-white/10 text-white";

          return (
            <button
              key={key}
              type="button"
              onClick={() => pushValue(key)}
              className={`rounded-3xl border border-white/10 px-3 py-4 text-lg font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/18 ${accent} ${
                key === "0" ? "col-span-2" : ""
              }`}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
};
