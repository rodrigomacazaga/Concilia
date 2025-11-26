"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  FolderSync,
  ChevronRight,
  ChevronDown,
  FileText,
  RefreshCw,
  Plus,
  Check,
  AlertCircle,
  Server,
  Save,
  X,
  Edit3,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Modal component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}

// Large modal for file editing
interface FileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  onSave: (content: string) => Promise<void>;
  saving: boolean;
  readOnly?: boolean;
}

function FileEditorModal({
  isOpen,
  onClose,
  fileName,
  content,
  onSave,
  saving,
  readOnly = false,
}: FileEditorModalProps) {
  const [editContent, setEditContent] = useState(content);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSave(editContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900">{fileName}</h3>
            {readOnly && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                Solo lectura
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {readOnly ? (
            <pre className="h-full p-4 text-sm font-mono overflow-auto whitespace-pre-wrap bg-gray-50">
              {content}
            </pre>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full p-4 text-sm font-mono resize-none focus:outline-none border-0"
              placeholder="Contenido del archivo..."
              spellCheck={false}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Toast notification component
interface ToastProps {
  message: string;
  type: "success" | "error" | "loading";
  isVisible: boolean;
}

function Toast({ message, type, isVisible }: ToastProps) {
  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
    loading: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    loading: "bg-blue-50 border-blue-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg ${bgColors[type]}`}
    >
      {icons[type]}
      <span className="text-sm">{message}</span>
    </motion.div>
  );
}

interface ServiceSummary {
  name: string;
  version: string;
  description: string;
  port?: number;
  technology?: string;
  endpoints_count: number;
  tables_count: number;
  status: string;
  last_sync?: string;
  has_local_memory_bank: boolean;
}

interface MemoryBankFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  size: number;
}

interface MemoryBankPanelProps {
  projectId: string;
  currentService?: string | null;
  onServiceSelect?: (service: string | null) => void;
}

export function MemoryBankPanel({
  projectId,
  currentService,
  onServiceSelect,
}: MemoryBankPanelProps) {
  const [generalMB, setGeneralMB] = useState<{
    exists: boolean;
    projectName?: string;
    files?: MemoryBankFile[];
    services?: ServiceSummary[];
  } | null>(null);

  const [localMB, setLocalMB] = useState<{
    exists: boolean;
    serviceName?: string;
    files?: MemoryBankFile[];
    config?: any;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [showEditorModal, setShowEditorModal] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    general: true,
    services: true,
  });

  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceTechnology, setNewServiceTechnology] = useState("node");
  const [newServicePort, setNewServicePort] = useState("");

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "loading";
    isVisible: boolean;
  }>({ message: "", type: "success", isVisible: false });

  const showToast = (message: string, type: "success" | "error" | "loading") => {
    setToast({ message, type, isVisible: true });
    if (type !== "loading") {
      setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3000);
    }
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  const loadMemoryBanks = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // Cargar Memory Bank general
      const generalRes = await fetch(
        `/api/memory-bank/hierarchical?projectId=${projectId}`
      );
      const generalData = await generalRes.json();
      setGeneralMB(generalData.success ? generalData : null);

      // Cargar Memory Bank local si hay servicio seleccionado
      if (currentService) {
        const localRes = await fetch(
          `/api/memory-bank/service/${currentService}?projectId=${projectId}`
        );
        const localData = await localRes.json();
        setLocalMB(localData.success ? localData : null);
      } else {
        setLocalMB(null);
      }
    } catch (error) {
      console.error("Error loading memory banks:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentService]);

  useEffect(() => {
    loadMemoryBanks();
  }, [loadMemoryBanks]);

  // Cargar contenido del archivo seleccionado
  useEffect(() => {
    if (selectedFile) {
      let file: MemoryBankFile | undefined;

      if (currentService && localMB?.exists) {
        file = localMB.files?.find((f) => f.name === selectedFile);
      } else if (generalMB?.exists) {
        file = generalMB.files?.find((f) => f.name === selectedFile);
      }

      if (file) {
        setFileContent(file.content);
      }
    }
  }, [selectedFile, currentService, localMB, generalMB]);

  const handleSync = async (service?: string) => {
    setSyncing(true);

    try {
      await fetch("/api/memory-bank/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          service,
        }),
      });

      await loadMemoryBanks();
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleInitGeneral = async () => {
    setInitializing(true);
    showToast("Inicializando Memory Bank general...", "loading");

    try {
      const res = await fetch("/api/memory-bank/init-hierarchical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        hideToast();
        showToast("Memory Bank general creado exitosamente", "success");
        await loadMemoryBanks();
      } else {
        hideToast();
        showToast(data.error || "Error al crear Memory Bank", "error");
      }
    } catch (error) {
      hideToast();
      showToast("Error de conexión al crear Memory Bank", "error");
      console.error("Error initializing general MB:", error);
    } finally {
      setInitializing(false);
    }
  };

  const handleInitService = async () => {
    if (!newServiceName.trim()) {
      showToast("El nombre del servicio es requerido", "error");
      return;
    }

    const config = {
      description: newServiceDescription || `Servicio ${newServiceName}`,
      technology: newServiceTechnology,
      port: newServicePort ? parseInt(newServicePort) : 5000 + Math.floor(Math.random() * 1000),
    };

    setInitializing(true);
    showToast(`Creando servicio ${newServiceName}...`, "loading");
    setShowServiceModal(false);

    try {
      const res = await fetch("/api/memory-bank/init-hierarchical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, service: newServiceName.trim(), config }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        hideToast();
        showToast(`Servicio "${newServiceName}" creado exitosamente`, "success");
        // Reset form
        setNewServiceName("");
        setNewServiceDescription("");
        setNewServiceTechnology("node");
        setNewServicePort("");
        await loadMemoryBanks();
      } else {
        hideToast();
        showToast(data.error || "Error al crear servicio", "error");
      }
    } catch (error) {
      hideToast();
      showToast("Error de conexión al crear servicio", "error");
      console.error("Error initializing service MB:", error);
    } finally {
      setInitializing(false);
    }
  };

  const handleSaveFile = async (newContent: string) => {
    if (!selectedFile || !currentService) return;

    setSaving(true);

    try {
      const res = await fetch(
        `/api/memory-bank/service/${currentService}?projectId=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile,
            content: newContent,
            triggerSync: true,
          }),
        }
      );

      if (res.ok) {
        setFileContent(newContent);
        setShowEditorModal(false);
        showToast("Archivo guardado exitosamente", "success");
        await loadMemoryBanks();
      } else {
        showToast("Error al guardar el archivo", "error");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      showToast("Error de conexión al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: "general" | "services") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        Cargando Memory Banks...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-orange-500" />
            Memory Bank Jerárquico
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => loadMemoryBanks()}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Recargar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSync()}
              disabled={syncing}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Sincronizar todo"
            >
              <FolderSync
                className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {currentService && (
          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
            <Server className="w-3 h-3" />
            {currentService}
            <button
              onClick={() => onServiceSelect?.(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Memory Bank General */}
        <div className="border-b">
          <button
            onClick={() => toggleSection("general")}
            className="w-full p-2 flex items-center gap-2 hover:bg-gray-100 text-left text-sm"
          >
            {expandedSections.general ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">General</span>
            {generalMB?.exists ? (
              <Check className="w-3 h-3 text-green-500 ml-auto" />
            ) : (
              <AlertCircle className="w-3 h-3 text-yellow-500 ml-auto" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.general && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {!generalMB?.exists ? (
                  <div className="px-3 pb-3">
                    <button
                      onClick={handleInitGeneral}
                      disabled={initializing}
                      className="w-full p-2 text-xs text-center text-orange-600 border border-orange-200 rounded hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {initializing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {initializing ? "Inicializando..." : "Inicializar Memory Bank General"}
                    </button>
                  </div>
                ) : (
                  <div className="px-2 pb-2">
                    {generalMB.files?.map((file) => (
                      <button
                        key={file.name}
                        onClick={() => {
                          setSelectedFile(file.name);
                          onServiceSelect?.(null);
                        }}
                        className={`w-full p-1.5 text-left text-xs rounded flex items-center gap-2 hover:bg-gray-100 ${
                          selectedFile === file.name && !currentService
                            ? "bg-orange-100"
                            : ""
                        }`}
                      >
                        <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {file.name.replace(".md", "")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Servicios */}
        <div>
          <button
            onClick={() => toggleSection("services")}
            className="w-full p-2 flex items-center gap-2 hover:bg-gray-100 text-left text-sm"
          >
            {expandedSections.services ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">Servicios</span>
            <span className="text-xs text-gray-500 ml-auto">
              ({generalMB?.services?.length || 0})
            </span>
          </button>

          <AnimatePresence>
            {expandedSections.services && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2">
                  {generalMB?.services?.map((service) => (
                    <div key={service.name} className="mb-1">
                      <button
                        onClick={() => {
                          onServiceSelect?.(service.name);
                          setSelectedFile(null);
                        }}
                        className={`w-full p-1.5 text-left text-xs rounded flex items-center justify-between hover:bg-gray-100 ${
                          currentService === service.name ? "bg-blue-100" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Server className="w-3 h-3 text-gray-400" />
                          <span>{service.name}</span>
                          <span className="text-[10px] text-gray-400">
                            v{service.version}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {service.last_sync ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                      </button>

                      {/* Archivos del servicio seleccionado */}
                      {currentService === service.name && localMB?.exists && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          {localMB.files?.map((file) => (
                            <button
                              key={file.name}
                              onClick={() => {
                                setSelectedFile(file.name);
                              }}
                              className={`w-full p-1 text-left text-[11px] rounded flex items-center gap-2 hover:bg-gray-100 ${
                                selectedFile === file.name ? "bg-orange-50" : ""
                              }`}
                            >
                              <FileText className="w-2.5 h-2.5 text-gray-400" />
                              <span className="truncate">
                                {file.name.replace(".md", "")}
                              </span>
                            </button>
                          ))}

                          <button
                            onClick={() => handleSync(service.name)}
                            disabled={syncing}
                            className="w-full p-1 text-left text-[11px] text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2"
                          >
                            <FolderSync
                              className={`w-2.5 h-2.5 ${syncing ? "animate-spin" : ""}`}
                            />
                            Sync to General
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Botón agregar servicio */}
                  <button
                    onClick={() => setShowServiceModal(true)}
                    disabled={initializing}
                    className="w-full p-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 rounded flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar servicio
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* File Preview - Compact */}
      {selectedFile && (
        <div className="border-t bg-white">
          <div className="p-2 border-b text-xs font-medium bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <span className="truncate">{selectedFile}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditorModal(true)}
                className="p-1 hover:bg-gray-200 rounded text-gray-600"
                title={currentService ? "Editar archivo" : "Ver archivo"}
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-gray-200 rounded text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <pre className="p-2 text-[11px] overflow-auto whitespace-pre-wrap font-mono text-gray-600 max-h-32 line-clamp-6">
            {fileContent.substring(0, 500)}{fileContent.length > 500 ? "..." : ""}
          </pre>
          <button
            onClick={() => setShowEditorModal(true)}
            className="w-full p-1.5 text-xs text-center text-orange-600 hover:bg-orange-50 border-t"
          >
            {currentService ? "Abrir editor completo" : "Ver contenido completo"}
          </button>
        </div>
      )}

      {/* Modal de edición de archivos */}
      <FileEditorModal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        fileName={selectedFile || ""}
        content={fileContent}
        onSave={handleSaveFile}
        saving={saving}
        readOnly={!currentService}
      />

      {/* Modal para crear servicio */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Crear nuevo servicio"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del servicio *
            </label>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="ej: auth-service"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={newServiceDescription}
              onChange={(e) => setNewServiceDescription(e.target.value)}
              placeholder="ej: Servicio de autenticación"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tecnología
              </label>
              <select
                value={newServiceTechnology}
                onChange={(e) => setNewServiceTechnology(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="node">Node.js</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="dotnet">.NET</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Puerto
              </label>
              <input
                type="number"
                value={newServicePort}
                onChange={(e) => setNewServicePort(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowServiceModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleInitService}
              disabled={!newServiceName.trim() || initializing}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {initializing && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear servicio
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast notification */}
      <AnimatePresence>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
        />
      </AnimatePresence>
    </div>
  );
}

export default MemoryBankPanel;
