"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  // Log cuando el componente se monta y cuando cambian las props
  useEffect(() => {
    console.log("🔧 ChatInput montado/actualizado");
    console.log("🔧 disabled:", disabled);
    console.log("🔧 onSendMessage es función:", typeof onSendMessage === "function");
  }, [disabled, onSendMessage]);

  const handleSend = () => {
    console.log("🔹 handleSend llamado");
    console.log("🔹 Mensaje:", message);
    console.log("🔹 Message trimmed:", message.trim());
    console.log("🔹 Disabled:", disabled);

    if (message.trim() && !disabled) {
      console.log("✅ Condiciones OK, llamando onSendMessage");
      onSendMessage(message);
      setMessage("");
    } else {
      console.log("❌ Condiciones NO cumplidas:", {
        hasTrimmedMessage: !!message.trim(),
        isNotDisabled: !disabled,
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("⌨️ Tecla presionada:", e.key, "- Shift:", e.shiftKey);
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("✅ Enter sin Shift detectado - llamando handleSend");
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-claude-border bg-white/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative flex items-end gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => {
                console.log("⌨️ Texto cambiado:", e.target.value);
                setMessage(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Envía un mensaje a Claude..."
              rows={1}
              className="w-full resize-none rounded-2xl border border-claude-border bg-white px-4 py-3 pr-12
                       text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-claude-orange/20
                       focus:border-claude-orange disabled:opacity-50 disabled:cursor-not-allowed
                       text-[15px] leading-relaxed max-h-32 overflow-y-auto"
              style={{
                minHeight: "44px",
                height: "auto",
              }}
            />
          </div>

          {/* Botón de enviar */}
          <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={() => {
              console.log("🖱️ Botón de enviar clickeado");
              console.log("🖱️ Estado del botón - disabled:", disabled || !message.trim());
              handleSend();
            }}
            disabled={disabled || !message.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-claude-orange text-white
                     flex items-center justify-center transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-orange-600 active:bg-orange-700
                     shadow-sm hover:shadow-md"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Hint text */}
        <div className="mt-2 text-xs text-gray-400 text-center">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </div>
      </div>
    </div>
  );
}
