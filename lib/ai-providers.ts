// Configuración de proveedores de IA para Juliet

export type AIProvider = "anthropic" | "google" | "openai";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  maxTokens: number;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  description?: string;
}

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiKeyPrefix: string;
  apiKeyPlaceholder: string;
  consoleUrl: string;
  modelsEndpoint?: string;
  defaultModel: string;
}

// Configuración de proveedores
export const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    apiKeyPrefix: "sk-ant-",
    apiKeyPlaceholder: "sk-ant-api03-...",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    modelsEndpoint: "https://api.anthropic.com/v1/models",
    defaultModel: "claude-sonnet-4-5-20250929",
  },
  google: {
    id: "google",
    name: "Google (Gemini)",
    apiKeyPrefix: "AIza",
    apiKeyPlaceholder: "AIzaSy...",
    consoleUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-2.0-flash",
  },
  openai: {
    id: "openai",
    name: "OpenAI (GPT)",
    apiKeyPrefix: "sk-",
    apiKeyPlaceholder: "sk-proj-...",
    consoleUrl: "https://platform.openai.com/api-keys",
    modelsEndpoint: "https://api.openai.com/v1/models",
    defaultModel: "gpt-4o",
  },
};

// Modelos disponibles (actualizados manualmente o via API)
export const STATIC_MODELS: AIModel[] = [
  // Anthropic Claude models
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    maxTokens: 8192,
    contextWindow: 200000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Modelo más reciente y equilibrado de Anthropic",
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    maxTokens: 8192,
    contextWindow: 200000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Excelente balance entre velocidad y calidad",
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    maxTokens: 4096,
    contextWindow: 200000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Modelo más potente de Claude 3",
  },

  // Google Gemini models
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Modelo más reciente y rápido de Google",
  },
  {
    id: "gemini-2.0-flash-thinking-exp",
    name: "Gemini 2.0 Flash Thinking",
    provider: "google",
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Modelo con razonamiento mejorado",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    maxTokens: 8192,
    contextWindow: 2000000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Contexto más largo disponible",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Rápido y eficiente",
  },

  // OpenAI models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    maxTokens: 16384,
    contextWindow: 128000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Modelo flagship de OpenAI",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    maxTokens: 16384,
    contextWindow: 128000,
    supportsStreaming: true,
    supportsImages: true,
    description: "Versión más económica de GPT-4o",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    maxTokens: 4096,
    contextWindow: 128000,
    supportsStreaming: true,
    supportsImages: true,
    description: "GPT-4 optimizado para velocidad",
  },
  {
    id: "o1",
    name: "o1",
    provider: "openai",
    maxTokens: 100000,
    contextWindow: 200000,
    supportsStreaming: false,
    supportsImages: true,
    description: "Modelo de razonamiento avanzado de OpenAI",
  },
  {
    id: "o1-mini",
    name: "o1 Mini",
    provider: "openai",
    maxTokens: 65536,
    contextWindow: 128000,
    supportsStreaming: false,
    supportsImages: true,
    description: "Versión compacta del modelo o1",
  },
];

// Helpers
export function getProviderFromModel(modelId: string): AIProvider {
  const model = STATIC_MODELS.find((m) => m.id === modelId);
  if (model) return model.provider;

  // Inferir del ID
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("gemini-")) return "google";
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1")) return "openai";

  return "anthropic"; // default
}

export function getModelById(modelId: string): AIModel | undefined {
  return STATIC_MODELS.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return STATIC_MODELS.filter((m) => m.provider === provider);
}

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDERS[provider];
}

// Storage keys
export const API_KEY_STORAGE_PREFIX = "juliet_api_key_";
export const MODEL_STORAGE_KEY = "juliet_selected_model";
export const PROVIDER_STORAGE_KEY = "juliet_selected_provider";

// Funciones de storage
export function getStoredApiKey(provider: AIProvider): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
}

export function setStoredApiKey(provider: AIProvider, key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${API_KEY_STORAGE_PREFIX}${provider}`, key);
}

export function clearStoredApiKey(provider: AIProvider): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
}

export function hasStoredApiKey(provider: AIProvider): boolean {
  return !!getStoredApiKey(provider);
}

export function hasAnyApiKey(): boolean {
  return (
    hasStoredApiKey("anthropic") ||
    hasStoredApiKey("google") ||
    hasStoredApiKey("openai")
  );
}

export function getStoredModel(): string {
  if (typeof window === "undefined") return PROVIDERS.anthropic.defaultModel;
  return localStorage.getItem(MODEL_STORAGE_KEY) || PROVIDERS.anthropic.defaultModel;
}

export function setStoredModel(modelId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

export function getStoredProvider(): AIProvider {
  if (typeof window === "undefined") return "anthropic";
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored && (stored === "anthropic" || stored === "google" || stored === "openai")) {
    return stored;
  }
  return "anthropic";
}

export function setStoredProvider(provider: AIProvider): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}
