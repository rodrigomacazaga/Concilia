"use client";

import { useState } from "react";
import { FileEdit, FilePlus, Trash2, Clock, Undo2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useDevContext, FileChange } from "@/app/lib/DevContext";

export default function ChangesList() {
  const { fileChanges, clearFileChanges, setSelectedFile } = useDevContext();
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  const handleViewFile = async (path: string) => {
    try {
      const response = await fetch("/api/files/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedFile({
          path: data.path,
          content: data.content,
          lastModified: new Date(),
        });
      }
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const handleRevert = async (change: FileChange) => {
    if (!change.backupPath) {
      alert("No hay backup disponible para este archivo");
      return;
    }

    const confirmed = confirm(
      `¿Estás seguro de que quieres revertir ${change.path} al estado anterior?`
    );

    if (!confirmed) return;

    try {
      // Leer el backup
      const readResponse = await fetch("/api/files/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: change.backupPath }),
      });

      const backupData = await readResponse.json();
      if (!backupData.success) {
        alert("No se pudo leer el backup");
        return;
      }

      // Restaurar el archivo original
      const writeResponse = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: change.path,
          content: backupData.content,
        }),
      });

      const writeData = await writeResponse.json();
      if (writeData.success) {
        alert(`Archivo ${change.path} revertido exitosamente`);
        // Recargar el archivo si está seleccionado
        handleViewFile(change.path);
      }
    } catch (error) {
      console.error("Error reverting file:", error);
      alert("Error al revertir el archivo");
    }
  };

  const getActionIcon = (action: FileChange["action"]) => {
    switch (action) {
      case "created":
        return <FilePlus className="w-4 h-4 text-green-600" />;
      case "modified":
        return <FileEdit className="w-4 h-4 text-blue-600" />;
      case "deleted":
        return <Trash2 className="w-4 h-4 text-red-600" />;
    }
  };

  const getActionLabel = (action: FileChange["action"]) => {
    switch (action) {
      case "created":
        return "Creado";
      case "modified":
        return "Modificado";
      case "deleted":
        return "Eliminado";
    }
  };

  const getActionColor = (action: FileChange["action"]) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-700";
      case "modified":
        return "bg-blue-100 text-blue-700";
      case "deleted":
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-claude-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border bg-claude-beige/30">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Cambios en esta Sesión
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {fileChanges.length} archivo{fileChanges.length !== 1 ? "s" : ""}{" "}
            modificado{fileChanges.length !== 1 ? "s" : ""}
          </p>
        </div>

        {fileChanges.length > 0 && (
          <button
            onClick={() => {
              if (confirm("¿Limpiar el historial de cambios?")) {
                clearFileChanges();
              }
            }}
            className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-auto">
        {fileChanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
            <FileEdit className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No hay cambios en esta sesión
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Los archivos modificados por Claude aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="py-2">
            {fileChanges.map((change, idx) => (
              <motion.div
                key={`${change.path}-${change.timestamp.getTime()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(change.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Path */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {change.path}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded ${getActionColor(
                          change.action
                        )}`}
                      >
                        {getActionLabel(change.action)}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {change.timestamp.toLocaleTimeString()}
                    </div>

                    {/* Backup info */}
                    {change.backupPath && (
                      <div className="mt-2 text-xs text-gray-400">
                        Backup: {change.backupPath}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleViewFile(change.path)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </button>

                      {change.backupPath && change.action === "modified" && (
                        <button
                          onClick={() => handleRevert(change)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        >
                          <Undo2 className="w-3 h-3" />
                          Revertir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
