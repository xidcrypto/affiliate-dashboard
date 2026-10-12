"use client";
import { createContext, useCallback, useContext, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

const Ctx = createContext<{ toast: (message: string, tone?: ToastItem["tone"]) => void }>({
  toast: () => {},
});

export const useToast = () => useContext(Ctx);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = nextId++;
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-20 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 sm:px-0">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-[12px] border border-border bg-surface px-4 py-3 text-sm shadow-lift ${
              t.tone === "success" ? "border-success/40" : t.tone === "error" ? "border-danger/40" : ""
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
