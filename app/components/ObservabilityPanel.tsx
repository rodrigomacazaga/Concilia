'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  traceId?: string;
}

interface ErrorReport {
  id: string;
  type: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack?: string;
  url?: string;
  timestamp: string;
  resolved?: boolean;
}

interface ErrorStats {
  total: number;
  unresolved: number;
  byType: Record<string, number>;
  last24h: number;
}

type ViewMode = 'logs' | 'errors' | 'metrics';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-500 bg-gray-100',
  info: 'text-blue-600 bg-blue-100',
  warn: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
  fatal: 'text-red-800 bg-red-200',
};

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  debug: <Terminal className="w-3 h-3" />,
  info: <Activity className="w-3 h-3" />,
  warn: <AlertTriangle className="w-3 h-3" />,
  error: <XCircle className="w-3 h-3" />,
  fatal: <Bug className="w-3 h-3" />,
};

export function ObservabilityPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [filterContext, setFilterContext] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLevel !== 'all') params.set('level', filterLevel);
      if (filterContext) params.set('context', filterContext);
      params.set('limit', '200');

      const res = await fetch(`/api/observability/logs?${params}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, [filterLevel, filterContext]);

  // Fetch errors
  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/errors?limit=100');
      const data = await res.json();

      if (data.success) {
        setErrors(data.data.errors);
        setErrorStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch errors:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLogs(), fetchErrors()]).finally(() => setLoading(false));
  }, [fetchLogs, fetchErrors]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (viewMode === 'logs') {
        fetchLogs();
      } else if (viewMode === 'errors') {
        fetchErrors();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, viewMode, fetchLogs, fetchErrors]);

  // Mark error as resolved
  const markResolved = async (errorId: string) => {
    try {
      await fetch('/api/observability/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: errorId, resolved: true }),
      });
      fetchErrors();
    } catch (err) {
      console.error('Failed to mark error resolved:', err);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-3 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-gray-800">Observabilidad</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded transition-colors ${
                autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                fetchLogs();
                fetchErrors();
              }}
              className="p-1.5 hover:bg-gray-100 rounded"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['logs', 'errors', 'metrics'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {mode === 'logs' && 'Logs'}
              {mode === 'errors' && (
                <span className="flex items-center justify-center gap-1">
                  Errores
                  {errorStats && errorStats.unresolved > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px]">
                      {errorStats.unresolved}
                    </span>
                  )}
                </span>
              )}
              {mode === 'metrics' && 'Métricas'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs View */}
      {viewMode === 'logs' && (
        <>
          {/* Filters */}
          <div className="p-2 border-b bg-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
              className="text-xs border rounded px-2 py-1 bg-white"
            >
              <option value="all">Todos los niveles</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="fatal">Fatal</option>
            </select>
            <input
              type="text"
              placeholder="Filtrar contexto..."
              value={filterContext}
              onChange={(e) => setFilterContext(e.target.value)}
              className="text-xs border rounded px-2 py-1 flex-1"
            />
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No hay logs disponibles
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.map((log, i) => {
                  const logId = `${log.timestamp}-${i}`;
                  const isExpanded = expandedLog === logId;

                  return (
                    <div key={logId} className="hover:bg-gray-50">
                      <div
                        className="p-2 cursor-pointer flex items-start gap-2"
                        onClick={() => setExpandedLog(isExpanded ? null : logId)}
                      >
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${LEVEL_COLORS[log.level]}`}>
                          {LEVEL_ICONS[log.level]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {formatTime(log.timestamp)}
                            </span>
                            {log.context && (
                              <span className="text-[10px] text-purple-500 font-mono">
                                [{log.context}]
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-800 truncate">{log.message}</p>
                        </div>
                        {(log.data || log.error) && (
                          isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )
                        )}
                      </div>

                      {isExpanded && (log.data || log.error) && (
                        <div className="px-2 pb-2 ml-8">
                          {log.data && (
                            <pre className="text-[10px] font-mono bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                          {log.error && (
                            <div className="mt-1 text-[10px] font-mono bg-red-50 p-2 rounded text-red-700">
                              <p className="font-semibold">{log.error.name}: {log.error.message}</p>
                              {log.error.stack && (
                                <pre className="mt-1 whitespace-pre-wrap text-red-600">
                                  {log.error.stack.split('\n').slice(0, 3).join('\n')}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </>
      )}

      {/* Errors View */}
      {viewMode === 'errors' && (
        <>
          {/* Stats */}
          {errorStats && (
            <div className="p-3 border-b bg-white grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-red-50 rounded">
                <p className="text-lg font-bold text-red-600">{errorStats.unresolved}</p>
                <p className="text-[10px] text-gray-500">Sin resolver</p>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <p className="text-lg font-bold text-orange-600">{errorStats.last24h}</p>
                <p className="text-[10px] text-gray-500">Últimas 24h</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-lg font-bold text-gray-600">{errorStats.total}</p>
                <p className="text-[10px] text-gray-500">Total</p>
              </div>
            </div>
          )}

          {/* Error list */}
          <div className="flex-1 overflow-y-auto">
            {errors.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p>No hay errores registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className={`p-3 hover:bg-gray-50 ${error.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`flex-shrink-0 p-1 rounded ${error.resolved ? 'bg-green-100' : 'bg-red-100'}`}>
                        {error.resolved ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Bug className="w-4 h-4 text-red-600" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-800">
                            {error.error.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                            {error.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {error.error.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTime(error.timestamp)}
                          </span>
                          {error.url && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                              {error.url}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(
                            `${error.error.name}: ${error.error.message}\n${error.error.stack || ''}`,
                            error.id
                          )}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Copiar"
                        >
                          {copied === error.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        {!error.resolved && (
                          <button
                            onClick={() => markResolved(error.id)}
                            className="p-1 hover:bg-green-100 rounded"
                            title="Marcar resuelto"
                          >
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Metrics View */}
      {viewMode === 'metrics' && (
        <div className="flex-1 p-4">
          <div className="text-center text-gray-400 text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Métricas en tiempo real</p>
            <p className="text-xs mt-1">Próximamente: CPU, memoria, requests/s</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservabilityPanel;
