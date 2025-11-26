"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  RefreshCw,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle,
  Layers,
  Code,
  Eye,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  filesAnalyzed: number;
  componentsFound: number;
  componentsAdded: number;
  violations: number;
  violationsByType?: Record<string, number>;
  message: string;
}

interface DesignSystemStatus {
  hasMemoryBank: boolean;
  hasDesignSystem: boolean;
  hasComponentLibrary: boolean;
  hasStyleTokens: boolean;
  theme?: { name: string; url?: string } | null;
}

interface DesignSystemPanelProps {
  projectId?: string | null;
}

export function DesignSystemPanel({ projectId }: DesignSystemPanelProps) {
  const [status, setStatus] = useState<DesignSystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadStatus();
    } else {
      setStatus(null);
      setAnalysisResult(null);
    }
  }, [projectId]);

  const loadStatus = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/design-system/analyze?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        setStatus({
          hasMemoryBank: data.hasMemoryBank,
          hasDesignSystem: data.hasDesignSystem,
          hasComponentLibrary: data.hasComponentLibrary,
          hasStyleTokens: data.hasStyleTokens,
          theme: data.theme,
        });
      }
    } catch (error) {
      console.error("Error loading design system status:", error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!projectId) return;

    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await fetch("/api/design-system/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data);
        await loadStatus(); // Refresh status
      }
    } catch (error) {
      console.error("Error analyzing design system:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const initializeDesignSystem = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/design-system/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, initialize: true }),
      });

      const data = await response.json();
      if (data.success) {
        await loadStatus();
      }
    } catch (error) {
      console.error("Error initializing design system:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (fileName: string) => {
    if (!projectId) return;

    setSelectedFile(fileName);
    setIsEditing(false);
    try {
      const response = await fetch(`/api/projects/${projectId}/memory-bank`);
      const data = await response.json();

      if (data.success && data.files && data.files[fileName]) {
        setFileContent(data.files[fileName]);
        setEditContent(data.files[fileName]);
      } else {
        setFileContent("");
        setEditContent("");
      }
    } catch (error) {
      console.error("Error loading file:", error);
      setFileContent("");
    }
  };

  const saveFile = async () => {
    if (!projectId || !selectedFile) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/memory-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: selectedFile,
          content: editContent,
        }),
      });

      if (response.ok) {
        setFileContent(editContent);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    } finally {
      setSaving(false);
    }
  };

  const designSystemFiles = [
    { name: "10-DESIGN-SYSTEM.md", label: "Design System", icon: Palette },
    { name: "11-COMPONENT-LIBRARY.md", label: "Component Library", icon: Layers },
    { name: "12-STYLE-TOKENS.md", label: "Style Tokens", icon: Code },
  ];

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="text-center">
          <Palette className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">Selecciona un proyecto</p>
          <p className="text-sm text-gray-400 mt-1">
            para ver su Design System
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-500" />
          <h3 className="font-medium text-gray-800">Design System</h3>
          {status?.theme && (
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
              {status.theme.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadStatus}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && !status ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Cargando...
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-lg border ${status?.hasDesignSystem ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  {status?.hasDesignSystem ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Design System</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${status?.hasComponentLibrary ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  {status?.hasComponentLibrary ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Components</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${status?.hasStyleTokens ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  {status?.hasStyleTokens ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Style Tokens</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${status?.hasMemoryBank ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  {status?.hasMemoryBank ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">Memory Bank</span>
                </div>
              </div>
            </div>

            {/* Initialize Button if no design system */}
            {status && !status.hasComponentLibrary && (
              <button
                onClick={initializeDesignSystem}
                disabled={loading}
                className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Inicializar Component Library
              </button>
            )}

            {/* Analyze Button */}
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {analyzing ? "Analizando..." : "Analizar Codebase"}
            </button>

            {/* Analysis Results */}
            <AnimatePresence>
              {analysisResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 rounded-lg p-4 space-y-2"
                >
                  <h4 className="font-medium text-gray-700">Resultados del Análisis</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Archivos:</span>
                      <span className="font-medium">{analysisResult.filesAnalyzed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Componentes:</span>
                      <span className="font-medium">{analysisResult.componentsFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nuevos:</span>
                      <span className="font-medium text-green-600">+{analysisResult.componentsAdded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Violaciones:</span>
                      <span className={`font-medium ${analysisResult.violations > 0 ? "text-amber-600" : "text-green-600"}`}>
                        {analysisResult.violations}
                      </span>
                    </div>
                  </div>
                  {analysisResult.violationsByType && Object.keys(analysisResult.violationsByType).length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-1">Violaciones por tipo:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analysisResult.violationsByType).map(([type, count]) => (
                          <span key={type} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{analysisResult.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File List */}
            {status?.hasMemoryBank && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Archivos del Design System
                </h4>
                <div className="space-y-1">
                  {designSystemFiles.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => loadFile(file.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                        selectedFile === file.name
                          ? "bg-pink-100 text-pink-700"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <file.icon className="w-4 h-4" />
                      {file.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* File Viewer/Editor */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b">
                    <span className="text-sm font-medium text-gray-700">{selectedFile}</span>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveFile}
                            disabled={saving}
                            className="p-1.5 hover:bg-gray-200 rounded text-green-600"
                            title="Guardar"
                          >
                            {saving ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditContent(fileContent);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                            title="Cerrar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-64 p-3 text-sm font-mono focus:outline-none resize-none"
                    />
                  ) : (
                    <div className="h-64 overflow-auto p-3">
                      <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                        {fileContent || "Archivo vacío"}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <p className="text-xs text-gray-400">
          El Design System se actualiza automáticamente en modo Execute/DeepThink.
        </p>
      </div>
    </div>
  );
}

export default DesignSystemPanel;
