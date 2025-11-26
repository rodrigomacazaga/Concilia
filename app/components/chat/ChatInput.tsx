"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { Send, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredModel, setStoredModel, hasAnyApiKey } from "@/app/components/ApiKeyModal";
import {
  AIProvider,
  getStoredApiKey,
  getProviderFromModel,
  PROVIDERS,
} from "@/lib/ai-providers";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider?: AIProvider;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
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
    if (!hasAnyApiKey()) return;

    setIsLoadingModels(true);
    try {
      // Construir headers con todas las API keys disponibles
      const headers: Record<string, string> = {};

      const anthropicKey = getStoredApiKey("anthropic");
      const googleKey = getStoredApiKey("google");
      const openaiKey = getStoredApiKey("openai");

      if (anthropicKey) headers["x-anthropic-key"] = anthropicKey;
      if (googleKey) headers["x-google-key"] = googleKey;
      if (openaiKey) headers["x-openai-key"] = openaiKey;

      const response = await fetch("/api/models", {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (data.success && data.models?.length > 0) {
        setModels(data.models);

        // Si el modelo seleccionado no está disponible, seleccionar el primero
        const currentModel = getStoredModel();
        const modelExists = data.models.some((m: ModelOption) => m.id === currentModel);
        if (!modelExists && data.models.length > 0) {
          setSelectedModel(data.models[0].id);
          setStoredModel(data.models[0].id);
        }
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

  const getSelectedModelProvider = () => {
    const provider = getProviderFromModel(selectedModel);
    return PROVIDERS[provider].name.split(" ")[0];
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

  // Agrupar modelos por proveedor
  const modelsByProvider = models.reduce(
    (acc, model) => {
      const provider = model.provider || getProviderFromModel(model.id);
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<AIProvider, ModelOption[]>
  );

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
            placeholder="Envía un mensaje a Juliet..."
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

          {/* Botón de enviar dentro del input - centrado verticalmente */}
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-claude-orange text-white
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
              <span className="text-gray-400">{getSelectedModelProvider()}:</span>
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
                    className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg shadow-lg
                             border border-gray-200 overflow-hidden z-20 max-h-80 overflow-y-auto"
                  >
                    {(["anthropic", "google", "openai"] as AIProvider[]).map((provider) => {
                      const providerModels = modelsByProvider[provider];
                      if (!providerModels || providerModels.length === 0) return null;

                      return (
                        <div key={provider}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase bg-gray-50 border-b">
                            {PROVIDERS[provider].name}
                          </div>
                          <div className="py-1">
                            {providerModels.map((model) => (
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
                        </div>
                      );
                    })}
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
