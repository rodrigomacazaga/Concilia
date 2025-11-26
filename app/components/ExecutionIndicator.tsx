'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  FilePlus,
  FilePen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink
} from 'lucide-react';

interface ExecutionResult {
  executed: boolean;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

interface ExecutionIndicatorProps {
  results: ExecutionResult | null;
  onFileClick?: (path: string) => void;
  compact?: boolean;
}

export function ExecutionIndicator({ results, onFileClick, compact = false }: ExecutionIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!results || !results.executed) {
    return null;
  }

  const hasErrors = results.errors.length > 0;
  const totalChanges = results.filesCreated.length + results.filesUpdated.length;

  if (totalChanges === 0 && results.errors.length === 0) {
    return null;
  }

  // Modo compacto - solo badge
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          hasErrors
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        } transition-colors`}
      >
        {hasErrors ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        {totalChanges} archivo(s)
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div
      className={`mt-3 rounded-lg border overflow-hidden ${
        hasErrors ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
          hasErrors ? 'hover:bg-yellow-100' : 'hover:bg-green-100'
        }`}
        onClick={() => compact && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          <span className="font-medium text-sm">
            {totalChanges} archivo(s){' '}
            {hasErrors ? 'procesado(s) con advertencias' : 'guardado(s)'}
          </span>
        </div>
        {compact && (
          <button className="p-1 hover:bg-white/50 rounded">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Files Created */}
          {results.filesCreated.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Creados
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {results.filesCreated.map((f) => (
                  <button
                    key={f}
                    onClick={() => onFileClick?.(f)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors group"
                  >
                    <FilePlus className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{f}</span>
                    {onFileClick && (
                      <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files Updated */}
          {results.filesUpdated.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Actualizados
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {results.filesUpdated.map((f) => (
                  <button
                    key={f}
                    onClick={() => onFileClick?.(f)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors group"
                  >
                    <FilePen className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{f}</span>
                    {onFileClick && (
                      <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {results.errors.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Errores
              </span>
              <div className="mt-1 space-y-1">
                {results.errors.map((e, i) => (
                  <div
                    key={i}
                    className="text-xs text-red-600 flex items-start gap-1 bg-red-50 px-2 py-1 rounded"
                  >
                    <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExecutionIndicator;
