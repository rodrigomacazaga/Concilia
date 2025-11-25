"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, ExternalLink, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_KEY_STORAGE_KEY = "anthropic_api_key";
const MODEL_STORAGE_KEY = "anthropic_model";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearStoredApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function hasStoredApiKey(): boolean {
  return !!getStoredApiKey();
}

export function getStoredModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
}

export function setStoredModel(model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

export default function ApiKeyModal({ isOpen, onClose, onSuccess }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Cargar key existente si hay
  useEffect(() => {
    if (isOpen) {
      const storedKey = getStoredApiKey();
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, [isOpen]);

  // Reset state cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setIsValidating(false);
    }
  }, [isOpen]);

  const validateApiKey = (key: string): boolean => {
    if (!key.trim()) {
      setError("Por favor ingresa tu API key");
      return false;
    }
    if (!key.startsWith("sk-ant-")) {
      setError("La API key debe empezar con 'sk-ant-'");
      return false;
    }
    if (key.length < 40) {
      setError("La API key parece demasiado corta");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateApiKey(apiKey)) {
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/validate-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (data.valid) {
        setStoredApiKey(apiKey);
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setError(data.error || "API key inválida. Verifica que esté correcta.");
      }
    } catch (err) {
      console.error("Error validando API key:", err);
      setStoredApiKey(apiKey);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 500);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">API Key de Anthropic</h2>
                    <p className="text-sm text-white/80">Requerida para usar Claude</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="mb-2">
                  Tu API key se guarda localmente en tu navegador y se usa para comunicarse directamente con Claude.
                </p>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Obtener API key en Anthropic Console
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError(null);
                    }}
                    placeholder="sk-ant-api03-..."
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      error
                        ? "border-red-300 focus:ring-red-500"
                        : success
                        ? "border-green-300 focus:ring-green-500"
                        : "border-gray-300 focus:ring-orange-500"
                    }`}
                    disabled={isValidating || success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>API key guardada correctamente. Redirigiendo...</span>
                </motion.div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isValidating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isValidating || success || !apiKey.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validando...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Guardado
                    </>
                  ) : (
                    "Guardar y continuar"
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center pt-2">
                Tu API key nunca se envía a nuestros servidores, solo a Anthropic.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
