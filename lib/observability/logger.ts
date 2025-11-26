/**
 * Structured Logging System
 * Provides consistent, structured logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  request?: {
    method?: string;
    url?: string;
    userAgent?: string;
  };
  duration?: number;
  traceId?: string;
}

export interface LoggerOptions {
  context?: string;
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableBuffer?: boolean;
  maxBufferSize?: number;
}

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Global log buffer for real-time viewing
const globalLogBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;
const logListeners: Set<(entry: LogEntry) => void> = new Set();

/**
 * Generate a trace ID for request correlation
 */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the global log buffer
 */
export function getLogBuffer(): LogEntry[] {
  return [...globalLogBuffer];
}

/**
 * Clear the log buffer
 */
export function clearLogBuffer(): void {
  globalLogBuffer.length = 0;
}

/**
 * Subscribe to new log entries
 */
export function subscribeToLogs(listener: (entry: LogEntry) => void): () => void {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

/**
 * Notify all listeners of a new log entry
 */
function notifyListeners(entry: LogEntry): void {
  logListeners.forEach(listener => {
    try {
      listener(entry);
    } catch (e) {
      // Don't let listener errors break logging
    }
  });
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: string;
  private minLevel: LogLevel;
  private enableConsole: boolean;
  private enableBuffer: boolean;
  private traceId?: string;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context || 'app';
    this.minLevel = options.minLevel || 'debug';
    this.enableConsole = options.enableConsole ?? true;
    this.enableBuffer = options.enableBuffer ?? true;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, traceId?: string): Logger {
    const child = new Logger({
      context: `${this.context}:${context}`,
      minLevel: this.minLevel,
      enableConsole: this.enableConsole,
      enableBuffer: this.enableBuffer,
    });
    child.traceId = traceId || this.traceId;
    return child;
  }

  /**
   * Set trace ID for request correlation
   */
  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    // Check if we should log at this level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      traceId: this.traceId,
    };

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Add to buffer
    if (this.enableBuffer) {
      globalLogBuffer.push(entry);
      if (globalLogBuffer.length > MAX_BUFFER_SIZE) {
        globalLogBuffer.shift();
      }
      notifyListeners(entry);
    }

    // Console output
    if (this.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Format and output to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    const traceInfo = entry.traceId ? ` [${entry.traceId}]` : '';

    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix}${traceInfo}`, entry.message, entry.data || '');
        break;
      case 'info':
        console.info(`${prefix}${traceInfo}`, entry.message, entry.data || '');
        break;
      case 'warn':
        console.warn(`${prefix}${traceInfo}`, entry.message, entry.data || '');
        break;
      case 'error':
      case 'fatal':
        console.error(`${prefix}${traceInfo}`, entry.message, entry.data || '', entry.error?.stack || '');
        break;
    }
  }

  // Convenience methods
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log('error', message, data, err);
  }

  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.log('fatal', message, data, err);
  }

  /**
   * Log API request/response
   */
  apiRequest(method: string, url: string, status: number, duration: number, error?: Error): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${url} ${status} ${duration}ms`, {
      method,
      url,
      status,
      duration,
    }, error);
  }

  /**
   * Measure execution time
   */
  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.debug(`${operation} completed`, { duration: Date.now() - start });
      return result;
    } catch (error) {
      this.error(`${operation} failed`, error, { duration: Date.now() - start });
      throw error;
    }
  }
}

// Default logger instance
export const logger = new Logger({ context: 'app' });

// Create context-specific loggers
export const apiLogger = new Logger({ context: 'api' });
export const uiLogger = new Logger({ context: 'ui' });
export const dbLogger = new Logger({ context: 'db' });
