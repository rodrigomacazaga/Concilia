'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Edit2, Save, FileCode, AlertCircle } from 'lucide-react';

interface CodeViewerProps {
  projectId?: string;
  filePath: string | null;
  onClose?: () => void;
  editable?: boolean;
  onSave?: (path: string, content: string) => void;
}

// Mapeo de extensiones a lenguajes para syntax highlighting
const getLanguage = (extension: string): string => {
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    go: 'go',
    rs: 'rust',
    yml: 'yaml',
    yaml: 'yaml',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
  };

  return languageMap[extension] || 'text';
};

export function CodeViewer({ projectId, filePath, onClose, editable = false, onSave }: CodeViewerProps) {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    lastModified: string;
    extension: string;
  } | null>(null);

  const loadFile = useCallback(async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/files/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al leer archivo');
      }

      setContent(data.content);
      setOriginalContent(data.content);
      setFileInfo({
        name: data.name || filePath.split('/').pop() || '',
        size: data.size || 0,
        lastModified: data.lastModified || new Date().toISOString(),
        extension: data.extension || filePath.split('.').pop() || '',
      });
    } catch (err: any) {
      console.error('Error loading file:', err);
      setError(err.message);
    }

    setLoading(false);
  }, [filePath]);

  useEffect(() => {
    if (filePath) {
      loadFile();
      setEditing(false);
    }
  }, [filePath, loadFile]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!filePath) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al guardar');
      }

      setOriginalContent(content);
      setEditing(false);
      onSave?.(filePath, content);
    } catch (err: any) {
      console.error('Error saving file:', err);
      setError(err.message);
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setContent(originalContent);
    setEditing(false);
  };

  const hasChanges = content !== originalContent;

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
        <FileCode className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Selecciona un archivo para ver su contenido</p>
      </div>
    );
  }

  const extension = filePath.split('.').pop() || '';
  const language = getLanguage(extension);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileCode className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="font-mono text-sm truncate">{filePath}</span>
          {hasChanges && (
            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded flex-shrink-0">
              modificado
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {editable && (
            editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`p-1.5 rounded ${
                    hasChanges
                      ? 'hover:bg-green-100 text-green-600'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title="Guardar"
                >
                  <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Copiar"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* File Info Bar */}
      {fileInfo && (
        <div className="flex items-center gap-4 px-3 py-1 text-xs text-gray-500 border-b bg-gray-50">
          <span>{language}</span>
          <span>{(fileInfo.size / 1024).toFixed(1)} KB</span>
          <span>{content.split('\n').length} líneas</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Cargando...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center p-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={loadFile}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : editing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-gray-900 text-gray-100"
            spellCheck={false}
            style={{ tabSize: 2 }}
          />
        ) : (
          <div className="relative">
            {/* Line numbers */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 border-r text-right select-none">
              <pre className="p-4 font-mono text-xs text-gray-400 leading-relaxed">
                {content.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </pre>
            </div>
            {/* Code content */}
            <pre className="p-4 pl-16 font-mono text-sm whitespace-pre-wrap break-words bg-white leading-relaxed">
              <code className={`language-${language}`}>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeViewer;
