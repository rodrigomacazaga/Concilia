"use client";

import { useState, useEffect } from "react";
import { FileText, BookOpen, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";

interface MemoryBankViewerProps {
  projectId: string;
}

interface MemoryBankData {
  exists: boolean;
  meta: string | null;
  files: Record<string, string>;
  projectName?: string;
  cached?: boolean;
}

export function MemoryBankViewer({ projectId }: MemoryBankViewerProps) {
  const [memoryBank, setMemoryBank] = useState<MemoryBankData | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemoryBank();
  }, [projectId]);

  const loadMemoryBank = async (skipCache = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = skipCache
        ? `/api/projects/${projectId}/memory-bank?cache=false`
        : `/api/projects/${projectId}/memory-bank`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load Memory Bank");
      }

      setMemoryBank(data);

      // Auto-seleccionar META si existe
      if (data.exists && data.meta) {
        setSelectedFile("META-MEMORY-BANK.md");
      } else if (data.exists && Object.keys(data.files || {}).length > 0) {
        // Seleccionar el primer archivo
        setSelectedFile(Object.keys(data.files)[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista de archivos ordenados
  const getOrderedFiles = () => {
    if (!memoryBank?.files) return [];

    return Object.keys(memoryBank.files).sort((a, b) => {
      if (a === "META-MEMORY-BANK.md") return -1;
      if (b === "META-MEMORY-BANK.md") return 1;

      const numA = parseInt(a.match(/^(\d+)/)?.[1] || "999");
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || "999");

      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-500">Cargando Memory Bank...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 border rounded-lg bg-red-50 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!memoryBank?.exists) {
    return (
      <div className="p-4">
        <div className="p-4 border rounded-lg bg-amber-50 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">No Memory Bank Found</p>
            <p className="text-sm text-amber-600">
              Create a <code className="bg-amber-100 px-1 rounded">memory-bank/</code> folder in your project with .md files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const orderedFiles = getOrderedFiles();

  return (
    <div className="flex h-full">
      {/* Sidebar: Lista de archivos */}
      <div className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-3 border-b bg-white sticky top-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              Memory Bank
            </h3>
            <button
              onClick={() => loadMemoryBank(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refrescar"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
          {memoryBank.cached && (
            <p className="text-xs text-gray-400 mt-1">Cached</p>
          )}
        </div>

        <div className="p-2 space-y-0.5">
          {orderedFiles.map((file) => {
            const isMeta = file === "META-MEMORY-BANK.md";
            const isSelected = selectedFile === file;

            return (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors text-sm ${
                  isSelected
                    ? "bg-orange-100 text-orange-800"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <FileText
                  className={`w-4 h-4 flex-shrink-0 ${
                    isMeta ? "text-orange-500" : "text-gray-400"
                  }`}
                />
                <span className={`truncate ${isMeta ? "font-medium" : ""}`}>
                  {isMeta ? "META (Reglas)" : file.replace(".md", "")}
                </span>
                {isSelected && (
                  <ChevronRight className="w-4 h-4 ml-auto text-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content: Contenido del archivo */}
      <div className="flex-1 overflow-y-auto">
        {selectedFile ? (
          <div className="p-4">
            <div className="mb-3 pb-3 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedFile === "META-MEMORY-BANK.md"
                  ? "META - Reglas del Memory Bank"
                  : selectedFile.replace(".md", "")}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{selectedFile}</p>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-700 overflow-x-auto">
                {memoryBank.files[selectedFile]}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Selecciona un archivo para ver su contenido</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemoryBankViewer;
