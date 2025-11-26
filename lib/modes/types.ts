/**
 * Sistema de Modos para Dev-Chat
 *
 * 3 modos de operacion:
 * - chat: Conversacion con contexto, no modifica codigo
 * - execute: Implementacion directa de codigo
 * - deepThink: Analisis profundo + planificacion antes de ejecutar
 */

export type Mode = 'chat' | 'execute' | 'deepThink';

export interface ModeConfig {
  id: Mode;
  name: string;
  icon: string;
  description: string;
  defaultModel: string;
  maxTokens: number;
  memoryBankLevel: 'summary' | 'relevant' | 'full';
  codeAccess: 'read' | 'relevant' | 'full';
  features: {
    canModifyCode: boolean;
    planBeforeExecute: boolean;
    autoUpdateMemoryBank: boolean;
    extendedThinking: boolean;
  };
}

export const MODE_CONFIGS: Record<Mode, ModeConfig> = {
  chat: {
    id: 'chat',
    name: 'Chat',
    icon: '💬',
    description: 'Conversacion con contexto completo del proyecto',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    memoryBankLevel: 'summary',
    codeAccess: 'read',
    features: {
      canModifyCode: false,
      planBeforeExecute: false,
      autoUpdateMemoryBank: false,
      extendedThinking: false
    }
  },
  execute: {
    id: 'execute',
    name: 'Execute',
    icon: '🚀',
    description: 'Implementacion directa de codigo',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    memoryBankLevel: 'relevant',
    codeAccess: 'relevant',
    features: {
      canModifyCode: true,
      planBeforeExecute: false,
      autoUpdateMemoryBank: true,
      extendedThinking: false
    }
  },
  deepThink: {
    id: 'deepThink',
    name: 'Deep Think',
    icon: '🧠',
    description: 'Analisis profundo y planificacion antes de ejecutar',
    defaultModel: 'claude-opus-4-20250514',
    maxTokens: 16000,
    memoryBankLevel: 'full',
    codeAccess: 'full',
    features: {
      canModifyCode: true,
      planBeforeExecute: true,
      autoUpdateMemoryBank: true,
      extendedThinking: true
    }
  }
};

export interface MemoryBankContent {
  files: Array<{
    name: string;
    content: string;
    truncated: boolean;
  }>;
  summary?: string;
  totalSize: number;
}

export interface CodeContext {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  structure?: string;
  dependencies?: string[];
}

export interface ModeContext {
  mode: Mode;
  config: ModeConfig;
  systemPrompt: string;
  memoryBank: {
    general: MemoryBankContent | null;
    local: MemoryBankContent | null;
  };
  codeContext: CodeContext | null;
  estimatedTokens: number;
}

// Modelos disponibles por proveedor
export const AVAILABLE_MODELS = {
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'premium' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'standard' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'standard' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', tier: 'fast' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'premium' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'standard' },
    { id: 'o1-preview', name: 'o1 Preview', tier: 'premium' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'premium' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'standard' },
  ]
};

// Tipo para guardar preferencias del usuario
export interface ModePreferences {
  chat: string;      // modelo seleccionado para chat
  execute: string;   // modelo seleccionado para execute
  deepThink: string; // modelo seleccionado para deepThink
}

export const DEFAULT_MODE_PREFERENCES: ModePreferences = {
  chat: 'claude-sonnet-4-20250514',
  execute: 'claude-sonnet-4-20250514',
  deepThink: 'claude-opus-4-20250514'
};
