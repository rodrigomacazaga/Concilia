"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Play,
  Square,
  RefreshCw,
  Terminal,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DockerPanelProps {
  projectId: string;
  serviceName?: string | null;
}

interface ServiceStatus {
  name: string;
  status: "running" | "stopped" | "not_built" | "error";
  port?: number;
  containerId?: string;
}

export function DockerPanel({ projectId, serviceName }: DockerPanelProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsService, setLogsService] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/docker?projectId=${projectId}`);
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error("Error loading docker services:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAction = async (service: string, action: string) => {
    setActionLoading(`${service}-${action}`);

    try {
      const res = await fetch(
        `/api/docker/${service}?projectId=${projectId}&action=${action}`,
        { method: "POST" }
      );

      if (!res.ok) {
        console.error(`Action ${action} failed for ${service}`);
      }

      await loadServices();
    } catch (error) {
      console.error("Error executing action:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogs = async (service: string) => {
    setLogsService(service);

    try {
      const res = await fetch(
        `/api/docker/${service}?projectId=${projectId}&action=logs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: 100 }),
        }
      );
      const data = await res.json();
      setLogs(data.logs || "No logs available");
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs("Error fetching logs");
    }
  };

  const closeLogs = () => {
    setLogs(null);
    setLogsService(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "stopped":
        return <Square className="w-4 h-4 text-gray-400" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Box className="w-4 h-4 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-50 text-gray-500";
    }
  };

  // Filtrar servicios si hay uno seleccionado
  const filteredServices = serviceName
    ? services.filter((s) => s.name === serviceName)
    : services;

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        <p className="text-xs">Cargando Docker...</p>
      </div>
    );
  }

  if (filteredServices.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Box className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-xs">No hay servicios Docker</p>
        <p className="text-[10px] mt-1">
          Los servicios aparecerán cuando los crees
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-white flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Box className="w-4 h-4 text-blue-500" />
          Docker
        </h3>
        <button
          onClick={loadServices}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
          title="Refrescar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredServices.map((service) => (
          <div
            key={service.name}
            className="border rounded-lg p-3 bg-white space-y-2"
          >
            {/* Service Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="font-medium text-sm">{service.name}</span>
                {service.port && (
                  <span className="text-xs text-gray-500">:{service.port}</span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${getStatusColor(service.status)}`}
              >
                {service.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              {service.status === "running" ? (
                <button
                  onClick={() => handleAction(service.name, "stop")}
                  disabled={actionLoading === `${service.name}-stop`}
                  className="flex-1 px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === `${service.name}-stop` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleAction(service.name, "start")}
                  disabled={actionLoading === `${service.name}-start`}
                  className="flex-1 px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === `${service.name}-start` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Start
                </button>
              )}

              <button
                onClick={() => handleAction(service.name, "build")}
                disabled={actionLoading === `${service.name}-build`}
                className="px-2 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
              >
                {actionLoading === `${service.name}-build` ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Build
              </button>

              <button
                onClick={() => handleLogs(service.name)}
                className="px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" />
                Logs
              </button>
            </div>

            {/* Quick Link when running */}
            {service.status === "running" && service.port && (
              <div className="pt-1">
                <a
                  href={`http://localhost:${service.port}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  localhost:{service.port}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Logs Modal */}
      <AnimatePresence>
        {logs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeLogs}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gray-600" />
                  <h4 className="font-semibold text-sm">
                    Logs: {logsService}
                  </h4>
                </div>
                <button
                  onClick={closeLogs}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <pre className="p-4 text-xs font-mono bg-gray-900 text-green-400 whitespace-pre-wrap min-h-full">
                  {logs}
                </pre>
              </div>
              <div className="p-2 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => logsService && handleLogs(logsService)}
                  className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refrescar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DockerPanel;
