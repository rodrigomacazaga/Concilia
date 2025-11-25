"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { Send, ChevronDown, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredApiKey, getStoredModel, setStoredModel } from "@/app/components/ApiKeyModal";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
];

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Cargar modelos al montar
  useEffect(() => {
    const storedModel = getStoredModel();
    setSelectedModel(storedModel);
    fetchModels();
  }, []);

  const fetchModels = async () => {
    const apiKey = getStoredApiKey();
    if (!apiKey) return;

    setIsLoadingModels(true);
    try {
      const response = await fetch("/api/models", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      const data = await response.json();

      if (data.success && data.models?.length > 0) {
        setModels(data.models);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setStoredModel(modelId);
    setIsModelDropdownOpen(false);
  };

  const getSelectedModelName = () => {
    const model = models.find((m) => m.id === selectedModel);
    return model?.name || "Seleccionar modelo";
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
              onChange={(e) => setMessage(e.target.value)}
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
            onClick={handleSend}
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

        {/* Footer con selector de modelo */}
        <div className="mt-3 flex items-center justify-between">
          {/* Selector de modelo */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              disabled={isLoadingModels}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900
                       hover:bg-gray-100 rounded-lg transition-colors border border-transparent
                       hover:border-gray-200"
            >
              <Cpu className="w-4 h-4" />
              <span className="font-medium">{getSelectedModelName()}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {isModelDropdownOpen && (
                <>
                  {/* Overlay para cerrar */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsModelDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-lg
                             border border-gray-200 overflow-hidden z-20"
                  >
                    <div className="p-2">
                      <p className="text-xs text-gray-500 px-2 py-1 font-medium">Modelos disponibles</p>
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelChange(model.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedModel === model.id
                              ? "bg-orange-50 text-orange-700"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <p className="font-medium">{model.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{model.id}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Hint text */}
          <div className="text-xs text-gray-400">
            Enter para enviar · Shift+Enter para nueva línea
          </div>
        </div>
      </div>
    </div>
  );
}
