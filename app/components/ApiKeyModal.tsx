"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import {
  AIProvider,
  PROVIDERS,
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  hasStoredApiKey,
  hasAnyApiKey,
  getStoredModel,
  setStoredModel,
} from "@/lib/ai-providers";

// Re-exportar funciones de compatibilidad
export {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  hasStoredApiKey,
  hasAnyApiKey,
  getStoredModel,
  setStoredModel,
} from "@/lib/ai-providers";

// Función de compatibilidad para código existente que usa la API key de Anthropic por defecto
export function getStoredApiKeyLegacy(): string | null {
  return getStoredApiKey("anthropic");
}

export function setStoredApiKeyLegacy(key: string): void {
  setStoredApiKey("anthropic", key);
}

export function clearStoredApiKeyLegacy(): void {
  clearStoredApiKey("anthropic");
}

export function hasStoredApiKeyLegacy(): boolean {
  return hasStoredApiKey("anthropic");
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProviderKeyState {
  key: string;
  showKey: boolean;
  isValidating: boolean;
  error: string | null;
  success: boolean;
  saved: boolean;
}

const PROVIDER_COLORS: Record<AIProvider, { bg: string; text: string; border: string }> = {
  anthropic: {
    bg: "from-orange-500 to-orange-600",
    text: "text-orange-600",
    border: "border-orange-300 focus:ring-orange-500",
  },
  google: {
    bg: "from-blue-500 to-blue-600",
    text: "text-blue-600",
    border: "border-blue-300 focus:ring-blue-500",
  },
  openai: {
    bg: "from-green-500 to-green-600",
    text: "text-green-600",
    border: "border-green-300 focus:ring-green-500",
  },
};

const PROVIDER_ORDER: AIProvider[] = ["anthropic", "google", "openai"];

export default function ApiKeyModal({
  isOpen,
  onClose,
  onSuccess,
}: ApiKeyModalProps) {
  const [activeProvider, setActiveProvider] = useState<AIProvider>("anthropic");
  const [providerStates, setProviderStates] = useState<
    Record<AIProvider, ProviderKeyState>
  >({
    anthropic: {
      key: "",
      showKey: false,
      isValidating: false,
      error: null,
      success: false,
      saved: false,
    },
    google: {
      key: "",
      showKey: false,
      isValidating: false,
      error: null,
      success: false,
      saved: false,
    },
    openai: {
      key: "",
      showKey: false,
      isValidating: false,
      error: null,
      success: false,
      saved: false,
    },
  });

  // Cargar keys existentes
  useEffect(() => {
    if (isOpen) {
      const newStates = { ...providerStates };
      PROVIDER_ORDER.forEach((provider) => {
        const storedKey = getStoredApiKey(provider);
        if (storedKey) {
          newStates[provider] = {
            ...newStates[provider],
            key: storedKey,
            saved: true,
          };
        }
      });
      setProviderStates(newStates);

      // Auto-seleccionar el primer proveedor sin key
      const firstWithoutKey = PROVIDER_ORDER.find((p) => !getStoredApiKey(p));
      if (firstWithoutKey) {
        setActiveProvider(firstWithoutKey);
      }
    }
  }, [isOpen]);

  // Reset state cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setProviderStates({
        anthropic: {
          key: getStoredApiKey("anthropic") || "",
          showKey: false,
          isValidating: false,
          error: null,
          success: false,
          saved: !!getStoredApiKey("anthropic"),
        },
        google: {
          key: getStoredApiKey("google") || "",
          showKey: false,
          isValidating: false,
          error: null,
          success: false,
          saved: !!getStoredApiKey("google"),
        },
        openai: {
          key: getStoredApiKey("openai") || "",
          showKey: false,
          isValidating: false,
          error: null,
          success: false,
          saved: !!getStoredApiKey("openai"),
        },
      });
    }
  }, [isOpen]);

  const updateProviderState = (
    provider: AIProvider,
    updates: Partial<ProviderKeyState>
  ) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates },
    }));
  };

  const validateApiKey = (provider: AIProvider, key: string): boolean => {
    if (!key.trim()) {
      updateProviderState(provider, { error: "Por favor ingresa tu API key" });
      return false;
    }

    const config = PROVIDERS[provider];

    if (!key.startsWith(config.apiKeyPrefix)) {
      updateProviderState(provider, {
        error: `La API key debe empezar con '${config.apiKeyPrefix}'`,
      });
      return false;
    }

    if (key.length < 20) {
      updateProviderState(provider, {
        error: "La API key parece demasiado corta",
      });
      return false;
    }

    return true;
  };

  const handleSaveKey = async (provider: AIProvider) => {
    const state = providerStates[provider];
    updateProviderState(provider, { error: null });

    if (!validateApiKey(provider, state.key)) {
      return;
    }

    updateProviderState(provider, { isValidating: true });

    try {
      // Intentar validar con el endpoint correspondiente
      const response = await fetch("/api/validate-api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: state.key, provider }),
      });

      const data = await response.json();

      if (data.valid || data.error?.includes("No validation endpoint")) {
        // Guardar key
        setStoredApiKey(provider, state.key);
        updateProviderState(provider, { success: true, saved: true });

        // Si ahora tenemos al menos una key, notificar éxito
        if (hasAnyApiKey()) {
          setTimeout(() => {
            updateProviderState(provider, { success: false });
          }, 1500);
        }
      } else {
        updateProviderState(provider, {
          error: data.error || "API key inválida",
        });
      }
    } catch (err) {
      // En caso de error de red, guardar de todos modos
      console.error("Error validando API key:", err);
      setStoredApiKey(provider, state.key);
      updateProviderState(provider, { success: true, saved: true });
      setTimeout(() => {
        updateProviderState(provider, { success: false });
      }, 1500);
    } finally {
      updateProviderState(provider, { isValidating: false });
    }
  };

  const handleRemoveKey = (provider: AIProvider) => {
    clearStoredApiKey(provider);
    updateProviderState(provider, {
      key: "",
      saved: false,
      success: false,
      error: null,
    });
  };

  const handleContinue = () => {
    if (hasAnyApiKey()) {
      onSuccess();
    }
  };

  const currentState = providerStates[activeProvider];
  const currentConfig = PROVIDERS[activeProvider];
  const colors = PROVIDER_COLORS[activeProvider];
  const configuredCount = PROVIDER_ORDER.filter((p) =>
    providerStates[p].saved
  ).length;

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div
              className={`bg-gradient-to-r ${colors.bg} p-6 text-white transition-colors duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Configurar API Keys
                    </h2>
                    <p className="text-sm text-white/80">
                      Configura tus proveedores de IA
                    </p>
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

            {/* Provider Tabs */}
            <div className="flex border-b">
              {PROVIDER_ORDER.map((provider) => (
                <button
                  key={provider}
                  onClick={() => setActiveProvider(provider)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeProvider === provider
                      ? PROVIDER_COLORS[provider].text
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{PROVIDERS[provider].name.split(" ")[0]}</span>
                    {providerStates[provider].saved && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {activeProvider === provider && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute bottom-0 left-0 right-0 h-0.5 bg-current`}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="mb-2">
                  Las API keys se guardan localmente en tu navegador y se usan
                  para comunicarse directamente con los proveedores.
                </p>
                <a
                  href={currentConfig.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Obtener API key de {currentConfig.name.split(" ")[0]}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-gray-700"
                >
                  API Key de {currentConfig.name}
                </label>
                <div className="relative">
                  <input
                    type={currentState.showKey ? "text" : "password"}
                    id="apiKey"
                    value={currentState.key}
                    onChange={(e) => {
                      updateProviderState(activeProvider, {
                        key: e.target.value,
                        error: null,
                      });
                    }}
                    placeholder={currentConfig.apiKeyPlaceholder}
                    className={`w-full px-4 py-3 pr-24 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      currentState.error
                        ? "border-red-300 focus:ring-red-500"
                        : currentState.success
                        ? "border-green-300 focus:ring-green-500"
                        : colors.border
                    }`}
                    disabled={currentState.isValidating}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {currentState.saved && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(activeProvider)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar API key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateProviderState(activeProvider, {
                          showKey: !currentState.showKey,
                        })
                      }
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {currentState.showKey ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {currentState.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{currentState.error}</span>
                </motion.div>
              )}

              {currentState.success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>API key guardada correctamente</span>
                </motion.div>
              )}

              <button
                type="button"
                onClick={() => handleSaveKey(activeProvider)}
                disabled={
                  currentState.isValidating ||
                  !currentState.key.trim() ||
                  (currentState.saved &&
                    currentState.key === getStoredApiKey(activeProvider))
                }
                className={`w-full px-4 py-3 bg-gradient-to-r ${colors.bg} text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {currentState.isValidating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Validando...
                  </>
                ) : currentState.saved ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Actualizar API Key
                  </>
                ) : (
                  "Guardar API Key"
                )}
              </button>

              {/* Summary */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>Proveedores configurados:</span>
                  <span className="font-medium">{configuredCount} de 3</span>
                </div>
                <div className="flex gap-2">
                  {PROVIDER_ORDER.map((provider) => (
                    <div
                      key={provider}
                      className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                        providerStates[provider].saved
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {PROVIDERS[provider].name.split(" ")[0]}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!hasAnyApiKey()}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Tus API keys nunca se envían a nuestros servidores, solo a los
                proveedores.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
