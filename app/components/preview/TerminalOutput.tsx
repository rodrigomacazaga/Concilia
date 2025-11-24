"use client";

import { useEffect, useRef } from "react";
import { Terminal, Check, X, Loader2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useDevContext, CommandExecution } from "@/app/lib/DevContext";

export default function TerminalOutput() {
  const { commandHistory, clearCommandHistory } = useDevContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay nuevos comandos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commandHistory]);

  const getStatusIcon = (status: CommandExecution["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "success":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: CommandExecution["status"]) => {
    switch (status) {
      case "running":
        return "border-blue-500 bg-blue-500/5";
      case "success":
        return "border-green-500 bg-green-500/5";
      case "error":
        return "border-red-500 bg-red-500/5";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-gray-200">Terminal</h3>
          <span className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-700 rounded">
            {commandHistory.length} comando{commandHistory.length !== 1 ? "s" : ""}
          </span>
        </div>

        {commandHistory.length > 0 && (
          <button
            onClick={() => {
              if (confirm("¿Limpiar el historial de comandos?")) {
                clearCommandHistory();
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {commandHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Terminal className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400">No hay comandos ejecutados</p>
            <p className="text-xs text-gray-500 mt-1">
              Los comandos que Claude ejecute aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandHistory.map((cmd, idx) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`border-l-2 pl-4 py-2 ${getStatusColor(cmd.status)}`}
              >
                {/* Command Header */}
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(cmd.status)}
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {cmd.timestamp.toLocaleTimeString()}
                  </span>
                  {cmd.status === "success" && cmd.exitCode !== undefined && (
                    <span className="text-xs text-green-400">
                      [exit {cmd.exitCode}]
                    </span>
                  )}
                  {cmd.status === "error" && cmd.exitCode !== undefined && (
                    <span className="text-xs text-red-400">
                      [exit {cmd.exitCode}]
                    </span>
                  )}
                </div>

                {/* Command */}
                <div className="mb-2">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-gray-200">{cmd.command}</span>
                </div>

                {/* Stdout */}
                {cmd.stdout && (
                  <div className="mt-2 whitespace-pre-wrap text-gray-300 bg-black/30 rounded p-2 text-xs">
                    {cmd.stdout}
                  </div>
                )}

                {/* Stderr */}
                {cmd.stderr && (
                  <div className="mt-2 whitespace-pre-wrap text-red-300 bg-red-900/20 rounded p-2 text-xs">
                    {cmd.stderr}
                  </div>
                )}

                {/* Error message */}
                {cmd.error && (
                  <div className="mt-2 text-red-400 bg-red-900/20 rounded p-2 text-xs">
                    ❌ Error: {cmd.error}
                  </div>
                )}

                {/* Running indicator */}
                {cmd.status === "running" && (
                  <div className="mt-2 text-blue-400 text-xs flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Ejecutando...
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700 bg-[#252526] text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>💻 Terminal en {process.cwd()}</span>
          <span>⏱️ Timeout: 60s</span>
        </div>
      </div>
    </div>
  );
}
