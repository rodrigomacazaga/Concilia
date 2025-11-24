"use client";

import { useState, useEffect } from "react";
import { Brain, FileText, Save, RefreshCw, Clock, Check, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryBankFile {
  name: string;
  displayName: string;
  icon: string;
}

interface MemoryBankPanelProps {
  onClose?: () => void;
}

const MEMORY_BANK_FILES: MemoryBankFile[] = [
  { name: "projectBrief.md", displayName: "Project Brief", icon: "📋" },
  { name: "productContext.md", displayName: "Product Context", icon: "🎯" },
  { name: "techContext.md", displayName: "Tech Context", icon: "⚙️" },
  { name: "systemPatterns.md", displayName: "System Patterns", icon: "🏗️" },
  { name: "activeContext.md", displayName: "Active Context", icon: "⚡" },
  { name: "progress.md", displayName: "Progress", icon: "📊" },
  { name: "decisionLog.md", displayName: "Decision Log", icon: "📝" },
  { name: "knownIssues.md", displayName: "Known Issues", icon: "🐛" },
];

export default function MemoryBankPanel({ onClose }: MemoryBankPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string>("projectBrief.md");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [editedContent, setEditedContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [status, setStatus] = useState<{
    initialized: boolean;
    completeness: number;
  } | null>(null);

  useEffect(() => {
    loadMemoryBank();
    loadStatus();
  }, []);

  useEffect(() => {
    setEditedContent(files[selectedFile] || "");
    setHasChanges(false);
  }, [selectedFile, files]);

  const loadMemoryBank = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/memory-bank");
      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Error loading memory bank:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/memory-bank/status");
      const data = await response.json();

      if (data.success) {
        setStatus({
          initialized: data.initialized,
          completeness: data.completeness,
        });
      }
    } catch (error) {
      console.error("Error loading status:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/memory-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: selectedFile,
          content: editedContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFiles((prev) => ({ ...prev, [selectedFile]: editedContent }));
        setLastSaved(new Date());
        setHasChanges(false);
        loadStatus();
      } else {
        alert("Error al guardar: " + data.error);
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (value: string) => {
    setEditedContent(value);
    setHasChanges(value !== files[selectedFile]);
  };

  const handleRefresh = () => {
    loadMemoryBank();
    loadStatus();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Memory Bank</h2>
            <p className="text-xs text-gray-600">
              {status ? (
                <>
                  {status.initialized ? (
                    <span className="text-green-600">✓ Inicializado</span>
                  ) : (
                    <span className="text-orange-600">⚠ No inicializado</span>
                  )}{" "}
                  · {status.completeness}% completo
                </>
              ) : (
                "Cargando..."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Check className="w-3 h-3 text-green-500" />
              Guardado {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File List */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <div className="p-3 space-y-1">
            {MEMORY_BANK_FILES.map((file) => {
              const isSelected = selectedFile === file.name;
              const hasContent = files[file.name] && !files[file.name].includes("[Pendiente");

              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? "bg-white shadow-sm border border-gray-200"
                      : "hover:bg-white/50"
                  }`}
                >
                  <span className="text-xl">{file.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {file.displayName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {hasContent ? (
                        <span className="text-green-600">● Completado</span>
                      ) : (
                        <span className="text-gray-400">○ Pendiente</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">
                {MEMORY_BANK_FILES.find((f) => f.name === selectedFile)?.displayName}
              </h3>
              {hasChanges && (
                <span className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Sin guardar
                </span>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-claude-orange text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <textarea
                value={editedContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full px-6 py-4 font-mono text-sm text-gray-800 resize-none focus:outline-none"
                placeholder="Escribe contenido aquí..."
                spellCheck={false}
              />
            )}
          </div>

          {/* Editor Footer */}
          <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Formato: Markdown</span>
              <span>Líneas: {editedContent.split("\n").length}</span>
              <span>Caracteres: {editedContent.length}</span>
            </div>
            {hasChanges && (
              <span className="text-orange-600">Presiona Guardar para aplicar cambios</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
