'use client';

import { Mode } from './ModeSelector';
import { Cpu, Zap, Clock, FileCode } from 'lucide-react';

interface ModeIndicatorProps {
  mode: Mode;
  model: string;
  serviceName?: string | null;
}

const MODE_STYLES = {
  chat: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '💬'
  },
  execute: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: '🚀'
  },
  deepThink: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: '🧠'
  }
};

const MODE_INFO = {
  chat: {
    name: 'Chat',
    canModify: false,
    memoryBank: 'Resumen',
    codeAccess: 'Lectura',
    estimatedTime: '< 5s'
  },
  execute: {
    name: 'Execute',
    canModify: true,
    memoryBank: 'Relevante',
    codeAccess: 'Lectura + Escritura',
    estimatedTime: '5-15s'
  },
  deepThink: {
    name: 'Deep Think',
    canModify: true,
    memoryBank: 'Completo',
    codeAccess: 'Analisis completo',
    estimatedTime: '30s-2min'
  }
};

export function ModeIndicator({ mode, model, serviceName }: ModeIndicatorProps) {
  const styles = MODE_STYLES[mode];
  const info = MODE_INFO[mode];

  const getModelShort = (modelId: string): string => {
    if (modelId.includes('opus')) return 'Opus';
    if (modelId.includes('sonnet-4-5')) return 'Sonnet 4.5';
    if (modelId.includes('sonnet')) return 'Sonnet';
    if (modelId.includes('haiku')) return 'Haiku';
    if (modelId.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (modelId.includes('gpt-4o')) return 'GPT-4o';
    if (modelId.includes('o1')) return 'o1';
    if (modelId.includes('gemini-1.5-pro')) return 'Gemini Pro';
    if (modelId.includes('gemini')) return 'Gemini Flash';
    return modelId.split('-').slice(0, 2).join(' ');
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-md text-xs ${styles.bg} ${styles.text} border ${styles.border}`}>
      {/* Mode */}
      <div className="flex items-center gap-1.5">
        <span>{styles.icon}</span>
        <span className="font-medium">{info.name}</span>
      </div>

      <div className="w-px h-3 bg-current opacity-30" />

      {/* Model */}
      <div className="flex items-center gap-1">
        <Cpu className="w-3 h-3" />
        <span>{getModelShort(model)}</span>
      </div>

      <div className="w-px h-3 bg-current opacity-30" />

      {/* Code access */}
      <div className="flex items-center gap-1">
        <FileCode className="w-3 h-3" />
        <span>{info.codeAccess}</span>
      </div>

      <div className="w-px h-3 bg-current opacity-30" />

      {/* Estimated time */}
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{info.estimatedTime}</span>
      </div>

      {/* Service name */}
      {serviceName && (
        <>
          <div className="w-px h-3 bg-current opacity-30" />
          <div className="flex items-center gap-1 opacity-70">
            <span>📦 {serviceName}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default ModeIndicator;
