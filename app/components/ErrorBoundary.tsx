'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to our observability system
    console.error('[ErrorBoundary] Caught error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Send to server for logging
    this.reportError(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch('/api/observability/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'react_error',
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          componentStack: errorInfo.componentStack,
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // Silently fail - don't let error reporting break the app further
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private copyErrorDetails = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const details = `
Error: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${typeof window !== 'undefined' ? window.location.href : ''}
Time: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      // Clipboard API not available
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, copied } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-800">Algo salió mal</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-gray-600 text-sm">
                Ha ocurrido un error inesperado. Puedes intentar recargar la página o reportar el problema.
              </p>

              {/* Error details (optional) */}
              {showDetails && error && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Bug className="w-3 h-3" />
                      Detalles del error
                    </span>
                    <button
                      onClick={this.copyErrorDetails}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-red-600 bg-red-50 p-2 rounded overflow-x-auto">
                    <p className="font-semibold">{error.name}: {error.message}</p>
                    {error.stack && (
                      <pre className="mt-2 text-gray-600 whitespace-pre-wrap text-[10px]">
                        {error.stack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error handler for functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('[useErrorHandler] Error:', error);
    setError(error);

    // Report to server
    fetch('/api/observability/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'handled_error',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

/**
 * Async error wrapper
 * Use this to wrap async operations and catch errors
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorHandler?.(err);
    console.error('[withErrorHandling] Error:', err);
    return null;
  }
}

export default ErrorBoundary;
