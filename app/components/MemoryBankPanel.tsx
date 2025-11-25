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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");

  const [expandedSections, setExpandedSections] = useState({
    general: true,
    services: true,
  });

  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setEditContent(file.content);
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
    try {
      const res = await fetch("/api/memory-bank/init-hierarchical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        await loadMemoryBanks();
      }
    } catch (error) {
      console.error("Error initializing general MB:", error);
    }
  };

  const handleInitService = async (serviceName: string) => {
    const config = {
      description: `Servicio ${serviceName}`,
      technology: "node",
      port: 5000 + Math.floor(Math.random() * 1000),
    };

    try {
      const res = await fetch("/api/memory-bank/init-hierarchical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, service: serviceName, config }),
      });

      if (res.ok) {
        await loadMemoryBanks();
      }
    } catch (error) {
      console.error("Error initializing service MB:", error);
    }
  };

  const handleSaveFile = async () => {
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
            content: editContent,
            triggerSync: true,
          }),
        }
      );

      if (res.ok) {
        setFileContent(editContent);
        setIsEditing(false);
        await loadMemoryBanks();
      }
    } catch (error) {
      console.error("Error saving file:", error);
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
                      className="w-full p-2 text-xs text-center text-orange-600 border border-orange-200 rounded hover:bg-orange-50"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Inicializar Memory Bank General
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
                          setIsEditing(false);
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
                          setIsEditing(false);
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
                                setIsEditing(false);
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
                    onClick={() => {
                      const name = prompt("Nombre del servicio:");
                      if (name) handleInitService(name);
                    }}
                    className="w-full p-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 rounded flex items-center gap-2"
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

      {/* File Preview/Editor */}
      {selectedFile && (
        <div className="border-t bg-white flex flex-col max-h-[40%]">
          <div className="p-2 border-b text-xs font-medium bg-gray-50 flex items-center justify-between">
            <span className="truncate">{selectedFile}</span>
            <div className="flex items-center gap-1">
              {currentService && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Editar"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(fileContent);
                    }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleSaveFile}
                    disabled={saving}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                    title="Guardar"
                  >
                    <Save
                      className={`w-3 h-3 ${saving ? "animate-pulse" : ""}`}
                    />
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 p-2 text-xs font-mono resize-none focus:outline-none"
              placeholder="Contenido del archivo..."
            />
          ) : (
            <pre className="flex-1 p-2 text-xs overflow-auto whitespace-pre-wrap font-mono">
              {fileContent}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default MemoryBankPanel;
