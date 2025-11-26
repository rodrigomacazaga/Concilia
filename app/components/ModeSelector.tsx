'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Rocket, Brain, ChevronDown, Check, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type Mode = 'chat' | 'execute' | 'deepThink';

export interface ModePreferences {
  chat: string;
  execute: string;
  deepThink: string;
}

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  availableModels: Array<{ id: string; name: string; provider: string }>;
}

const MODE_INFO = {
  chat: {
    id: 'chat' as Mode,
    name: 'Chat',
    icon: MessageSquare,
    shortcut: '⌘1',
    color: 'blue',
    bgActive: 'bg-blue-500',
    bgHover: 'hover:bg-blue-100',
    textColor: 'text-blue-600',
    description: 'Conversacion con contexto. No modifica codigo.',
    defaultModel: 'claude-sonnet-4-20250514'
  },
  execute: {
    id: 'execute' as Mode,
    name: 'Execute',
    icon: Rocket,
    shortcut: '⌘2',
    color: 'green',
    bgActive: 'bg-green-500',
    bgHover: 'hover:bg-green-100',
    textColor: 'text-green-600',
    description: 'Implementacion directa. Modifica codigo.',
    defaultModel: 'claude-sonnet-4-20250514'
  },
  deepThink: {
    id: 'deepThink' as Mode,
    name: 'Deep Think',
    icon: Brain,
    shortcut: '⌘3',
    color: 'purple',
    bgActive: 'bg-purple-500',
    bgHover: 'hover:bg-purple-100',
    textColor: 'text-purple-600',
    description: 'Analisis profundo. Planifica antes de ejecutar.',
    defaultModel: 'claude-opus-4-20250514'
  }
};

const STORAGE_KEY = 'juliet-mode-preferences';

// Guardar preferencias en localStorage
function savePreferences(prefs: ModePreferences) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
}

// Cargar preferencias de localStorage
export function loadPreferences(): ModePreferences {
  if (typeof window === 'undefined') {
    return {
      chat: MODE_INFO.chat.defaultModel,
      execute: MODE_INFO.execute.defaultModel,
      deepThink: MODE_INFO.deepThink.defaultModel
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }

  return {
    chat: MODE_INFO.chat.defaultModel,
    execute: MODE_INFO.execute.defaultModel,
    deepThink: MODE_INFO.deepThink.defaultModel
  };
}

export function ModeSelector({
  currentMode,
  onModeChange,
  selectedModel,
  onModelChange,
  disabled,
  availableModels
}: ModeSelectorProps) {
  const [showTooltip, setShowTooltip] = useState<Mode | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [preferences, setPreferences] = useState<ModePreferences>(loadPreferences);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cuando cambia el modo, usar el modelo guardado para ese modo
  useEffect(() => {
    const savedModel = preferences[currentMode];
    if (savedModel && savedModel !== selectedModel) {
      onModelChange(savedModel);
    }
  }, [currentMode]);

  // Guardar modelo cuando cambia
  const handleModelSelect = (modelId: string) => {
    const newPrefs = { ...preferences, [currentMode]: modelId };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
    onModelChange(modelId);
    setShowModelDropdown(false);
  };

  const currentModeInfo = MODE_INFO[currentMode];
  const currentModelName = availableModels.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex items-center gap-2">
      {/* Mode buttons */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        {(Object.entries(MODE_INFO) as [Mode, typeof MODE_INFO.chat][]).map(([mode, info]) => {
          const Icon = info.icon;
          const isActive = currentMode === mode;

          return (
            <div key={mode} className="relative">
              <button
                onClick={() => onModeChange(mode)}
                disabled={disabled}
                onMouseEnter={() => setShowTooltip(mode)}
                onMouseLeave={() => setShowTooltip(null)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md transition-all
                  ${isActive
                    ? `${info.bgActive} text-white`
                    : `${info.textColor} ${info.bgHover}`
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{info.name}</span>
              </button>

              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip === mode && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 mt-2 w-56 p-2 bg-white rounded-lg shadow-lg border z-50"
                  >
                    <div className="font-medium text-sm flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      {info.name}
                      <span className="text-xs text-gray-400 ml-auto">{info.shortcut}</span>
                    </div>
                    <p className="text-xs text-gray-600">{info.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Model selector dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
            ${showModelDropdown ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Cpu className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 max-w-32 truncate">{currentModelName}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showModelDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border z-50 py-1 max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                Modelo para {currentModeInfo.name}
              </div>

              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`
                    w-full text-left px-3 py-2 text-sm flex items-center justify-between
                    hover:bg-gray-50 transition-colors
                    ${selectedModel === model.id ? 'bg-orange-50' : ''}
                  `}
                >
                  <div>
                    <div className="font-medium text-gray-800">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.provider}</div>
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-orange-500" />
                  )}
                </button>
              ))}

              <div className="px-3 py-2 border-t mt-1 text-xs text-gray-400">
                Se guardara como predeterminado para {currentModeInfo.name}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ModeSelector;
