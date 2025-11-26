"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronUp,
  Home,
  HardDrive,
  X,
  Check,
  RefreshCw,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface QuickAccessItem {
  name: string;
  path: string;
}

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderPicker({
  isOpen,
  onClose,
  onSelect,
  initialPath,
}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // Cargar directorio
  const loadDirectory = async (path?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/files/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, showHidden }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setEntries(data.entries);
        setQuickAccess(data.quickAccess);
      } else {
        setError(data.error || "Error al cargar directorio");
      }
    } catch (err) {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  // Cargar directorio inicial cuando se abre
  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath);
    }
  }, [isOpen, initialPath]);

  // Recargar cuando cambia showHidden
  useEffect(() => {
    if (isOpen && currentPath) {
      loadDirectory(currentPath);
    }
  }, [showHidden]);

  const handleSelectFolder = () => {
    onSelect(currentPath);
    onClose();
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  // Obtener el nombre de la carpeta actual
  const currentFolderName = currentPath.split("/").pop() || currentPath;

  // Iconos para acceso rapido
  const getQuickAccessIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "home":
        return <Home className="w-4 h-4" />;
      case "root":
        return <HardDrive className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-orange-500" />
              Seleccionar Carpeta
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Current path bar */}
          <div className="px-4 py-2 bg-gray-100 border-b flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!parentPath || loading}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Subir un nivel"
            >
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex-1 text-sm text-gray-600 truncate font-mono bg-white px-3 py-1.5 rounded border">
              {currentPath || "..."}
            </div>
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Quick access sidebar */}
            <div className="w-48 border-r bg-gray-50 p-2 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase px-2 mb-2">
                Acceso Rapido
              </p>
              <div className="space-y-0.5">
                {quickAccess.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      currentPath === item.path
                        ? "bg-orange-100 text-orange-700"
                        : "hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {getQuickAccessIcon(item.name)}
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>

              {/* Show hidden toggle */}
              <div className="mt-4 px-2">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  Mostrar ocultos
                </label>
              </div>
            </div>

            {/* Directory listing */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Cargando...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">
                  <p>{error}</p>
                  <button
                    onClick={() => loadDirectory()}
                    className="mt-2 text-sm text-orange-500 hover:underline"
                  >
                    Volver al inicio
                  </button>
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carpeta vacia</p>
                </div>
              ) : (
                <div className="p-2">
                  {entries.map((entry) => (
                    <button
                      key={entry.path}
                      onClick={() => handleNavigate(entry.path)}
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-100 transition-colors group"
                    >
                      <Folder className="w-5 h-5 text-orange-400 flex-shrink-0" />
                      <span className="flex-1 truncate text-gray-700">
                        {entry.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer with selection */}
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FolderOpen className="w-4 h-4 text-orange-500" />
              <span className="font-medium truncate max-w-xs">
                {currentFolderName}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Seleccionar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FolderPicker;
