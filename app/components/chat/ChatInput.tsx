"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { Send, ChevronDown } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cargar modelos al montar
  useEffect(() => {
    const storedModel = getStoredModel();
    setSelectedModel(storedModel);
    fetchModels();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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
        {/* Input container con botón dentro */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Envía un mensaje a Claude..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-claude-border bg-white pl-4 pr-14 py-3
                     text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-claude-orange/20
                     focus:border-claude-orange disabled:opacity-50 disabled:cursor-not-allowed
                     text-[15px] leading-relaxed"
            style={{
              minHeight: "52px",
              maxHeight: "200px",
            }}
          />

          {/* Botón de enviar dentro del input */}
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="absolute right-2 bottom-2 w-9 h-9 rounded-lg bg-claude-orange text-white
                     flex items-center justify-center transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-orange-600 active:bg-orange-700"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Footer con selector de modelo */}
        <div className="mt-2 flex items-center justify-between">
          {/* Selector de modelo (dropdown) */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              disabled={isLoadingModels}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700
                       hover:bg-gray-100 rounded-md transition-colors"
            >
              <span>{getSelectedModelName()}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} />
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
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-lg shadow-lg
                             border border-gray-200 overflow-hidden z-20"
                  >
                    <div className="py-1">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelChange(model.id)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            selectedModel === model.id
                              ? "bg-orange-50 text-orange-700"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className="font-medium">{model.name}</span>
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
            <span className="hidden sm:inline">Enter para enviar · Shift+Enter nueva línea</span>
            <span className="sm:hidden">Enter ↵</span>
          </div>
        </div>
      </div>
    </div>
  );
}
