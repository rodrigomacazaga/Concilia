"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Plus,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  Terminal,
  X,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MCPServerStatus {
  id: string;
  name: string;
  running: boolean;
  pid?: number;
  tools?: { name: string; description: string }[];
  error?: string;
}

interface MCPServerPanelProps {
  projectId?: string | null;
}

export function MCPServerPanel({ projectId }: MCPServerPanelProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [statuses, setStatuses] = useState<MCPServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    command: "",
    args: "",
    env: "",
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mcp");
      const data = await response.json();

      if (data.success) {
        setServers(data.servers || []);
        setStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error("Error loading MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.command) return;

    setActionLoading("add");
    try {
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          command: formData.command,
          args: formData.args ? formData.args.split(" ").filter(Boolean) : undefined,
          env: formData.env ? parseEnvString(formData.env) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddForm(false);
        resetForm();
        await loadServers();
      }
    } catch (error) {
      console.error("Error adding MCP server:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !formData.name || !formData.command) return;

    setActionLoading("update");
    try {
      const response = await fetch(`/api/mcp/${editingServer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          command: formData.command,
          args: formData.args ? formData.args.split(" ").filter(Boolean) : undefined,
          env: formData.env ? parseEnvString(formData.env) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingServer(null);
        resetForm();
        await loadServers();
      }
    } catch (error) {
      console.error("Error updating MCP server:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este servidor MCP?")) return;

    setActionLoading(id);
    try {
      await fetch(`/api/mcp/${id}`, { method: "DELETE" });
      await loadServers();
    } catch (error) {
      console.error("Error deleting MCP server:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartServer = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/mcp/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error("Error starting MCP server:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopServer = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/mcp/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error("Error stopping MCP server:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      command: "",
      args: "",
      env: "",
    });
  };

  const startEditing = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      description: server.description || "",
      command: server.command,
      args: server.args?.join(" ") || "",
      env: server.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join("\n") : "",
    });
    setShowAddForm(false);
  };

  const parseEnvString = (envStr: string): Record<string, string> => {
    const env: Record<string, string> = {};
    envStr.split("\n").forEach(line => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    });
    return env;
  };

  const getServerStatus = (id: string): MCPServerStatus | undefined => {
    return statuses.find(s => s.id === id);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium text-gray-800">MCP Servers</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadServers}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingServer(null);
              resetForm();
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Agregar servidor"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Add/Edit Form */}
        <AnimatePresence>
          {(showAddForm || editingServer) && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={editingServer ? handleUpdateServer : handleAddServer}
              className="border-b bg-gray-50 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">
                    {editingServer ? "Editar Servidor" : "Nuevo Servidor MCP"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingServer(null);
                      resetForm();
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Nombre *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />

                <input
                  type="text"
                  placeholder="Descripción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Comando (ej: npx -y @modelcontextprotocol/server-filesystem) *"
                    value={formData.command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Argumentos (separados por espacio)"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />

                <textarea
                  placeholder="Variables de entorno (KEY=value, una por línea)"
                  value={formData.env}
                  onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono h-20"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading === "add" || actionLoading === "update"}
                    className="flex-1 px-3 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingServer ? "Guardar Cambios" : "Agregar Servidor"}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Server List */}
        {loading && servers.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Cargando...
          </div>
        ) : servers.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-2">No hay servidores MCP configurados</p>
            <p className="text-sm text-gray-400 mb-4">
              Los servidores MCP extienden las capacidades del asistente.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600"
            >
              Agregar Servidor
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {servers.map((server) => {
              const status = getServerStatus(server.id);
              const isRunning = status?.running;
              const isLoading = actionLoading === server.id;

              return (
                <div
                  key={server.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 truncate">
                          {server.name}
                        </span>
                        {isRunning ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <Square className="w-3 h-3" />
                            Detenido
                          </span>
                        )}
                      </div>
                      {server.description && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {server.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                        {server.command} {server.args?.join(" ")}
                      </p>
                      {status?.error && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {status.error}
                        </p>
                      )}
                      {status?.tools && status.tools.length > 0 && (
                        <p className="text-xs text-purple-500 mt-1">
                          {status.tools.length} herramienta(s) disponible(s)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isRunning ? (
                        <button
                          onClick={() => handleStopServer(server.id)}
                          disabled={isLoading}
                          className="p-1.5 hover:bg-red-100 rounded text-red-500"
                          title="Detener"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartServer(server.id)}
                          disabled={isLoading}
                          className="p-1.5 hover:bg-green-100 rounded text-green-500"
                          title="Iniciar"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(server)}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteServer(server.id)}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with info */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <p className="text-xs text-gray-400">
          Los servidores MCP añaden herramientas adicionales al chat.
        </p>
      </div>
    </div>
  );
}

export default MCPServerPanel;
