"use client";

import { Brain, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useDevContext } from "@/app/lib/DevContext";

interface MemoryBankBadgeProps {
  onOpenPanel?: () => void;
  onOpenOnboarding?: () => void;
}

export default function MemoryBankBadge({
  onOpenPanel,
  onOpenOnboarding,
}: MemoryBankBadgeProps) {
  const { memoryBankStatus } = useDevContext();

  if (!memoryBankStatus) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Cargando Memory Bank...</span>
      </div>
    );
  }

  const { initialized, completeness, exists } = memoryBankStatus;

  // Si no existe o no está inicializado
  if (!exists || !initialized) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onOpenOnboarding}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors cursor-pointer"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Memory Bank: No inicializado</span>
      </motion.button>
    );
  }

  // Si está inicializado
  const isComplete = completeness >= 80;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onOpenPanel}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer ${
        isComplete
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
      }`}
    >
      {isComplete ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Brain className="w-4 h-4" />
      )}
      <span className="font-medium">
        Memory Bank: {completeness}% completo
      </span>
    </motion.button>
  );
}
