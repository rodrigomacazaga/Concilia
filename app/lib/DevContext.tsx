"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface FileChange {
  path: string;
  timestamp: Date;
  action: "created" | "modified" | "deleted";
  backupPath?: string;
}

export interface SelectedFile {
  path: string;
  content: string;
  lastModified?: Date;
}

export interface MemoryBankStatus {
  initialized: boolean;
  completeness: number;
  exists: boolean;
}

export interface DevContextType {
  // Archivos modificados
  fileChanges: FileChange[];
  addFileChange: (change: FileChange) => void;
  clearFileChanges: () => void;

  // Archivo seleccionado
  selectedFile: SelectedFile | null;
  setSelectedFile: (file: SelectedFile | null) => void;

  // Estado del preview
  previewCollapsed: boolean;
  setPreviewCollapsed: (collapsed: boolean) => void;

  // Panel size
  leftPanelSize: number;
  setLeftPanelSize: (size: number) => void;

  // Tab activo en preview
  activePreviewTab: "preview" | "files" | "changes" | "terminal" | "chats" | "memory-bank" | "git" | "mcp" | "design-system" | "observability" | "agent" | "dashboard";
  setActivePreviewTab: (tab: "preview" | "files" | "changes" | "terminal" | "chats" | "memory-bank" | "git" | "mcp" | "design-system" | "observability" | "agent" | "dashboard") => void;

  // Notificaciones
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;

  // Comandos ejecutados
  commandHistory: CommandExecution[];
  addCommand: (command: Omit<CommandExecution, "id" | "timestamp">) => void;
  updateCommand: (id: string, updates: Partial<CommandExecution>) => void;
  clearCommandHistory: () => void;

  // Memory Bank
  memoryBankStatus: MemoryBankStatus | null;
  setMemoryBankStatus: (status: MemoryBankStatus | null) => void;
  refreshMemoryBankStatus: () => Promise<void>;
}

export interface Notification {
  id: string;
  type: "file_modified" | "file_created" | "error";
  message: string;
  filePath?: string;
  timestamp: Date;
}

export interface CommandExecution {
  id: string;
  command: string;
  timestamp: Date;
  status: "running" | "success" | "error";
  exitCode?: number;
  stdout: string;
  stderr: string;
  error?: string;
}

// ============================================================================
// Context
// ============================================================================

const DevContext = createContext<DevContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function DevContextProvider({ children }: { children: React.ReactNode }) {
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [leftPanelSize, setLeftPanelSize] = useState(50);
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "files" | "changes" | "terminal" | "chats" | "memory-bank" | "git" | "mcp" | "design-system" | "observability" | "agent" | "dashboard">("files");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandExecution[]>([]);
  const [memoryBankStatus, setMemoryBankStatus] = useState<MemoryBankStatus | null>(null);

  const addFileChange = useCallback((change: FileChange) => {
    setFileChanges((prev) => [...prev, change]);

    // Agregar notificación automáticamente
    const message =
      change.action === "created"
        ? `Archivo creado: ${change.path}`
        : change.action === "modified"
        ? `Archivo modificado: ${change.path}`
        : `Archivo eliminado: ${change.path}`;

    addNotification({
      type: change.action === "created" ? "file_created" : "file_modified",
      message,
      filePath: change.path,
    });
  }, []);

  const clearFileChanges = useCallback(() => {
    setFileChanges([]);
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remover después de 5 segundos
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 5000);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addCommand = useCallback(
    (command: Omit<CommandExecution, "id" | "timestamp">) => {
      const newCommand: CommandExecution = {
        ...command,
        id: `cmd-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      };
      setCommandHistory((prev) => [...prev, newCommand]);
      return newCommand.id;
    },
    []
  );

  const updateCommand = useCallback(
    (id: string, updates: Partial<CommandExecution>) => {
      setCommandHistory((prev) =>
        prev.map((cmd) => (cmd.id === id ? { ...cmd, ...updates } : cmd))
      );
    },
    []
  );

  const clearCommandHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  const refreshMemoryBankStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/memory-bank/status");
      const data = await response.json();

      if (data.success) {
        setMemoryBankStatus({
          initialized: data.initialized || false,
          completeness: data.completeness || 0,
          exists: data.exists || false,
        });
      }
    } catch (error) {
      console.error("Error fetching Memory Bank status:", error);
      setMemoryBankStatus(null);
    }
  }, []);

  const value: DevContextType = {
    fileChanges,
    addFileChange,
    clearFileChanges,
    selectedFile,
    setSelectedFile,
    previewCollapsed,
    setPreviewCollapsed,
    leftPanelSize,
    setLeftPanelSize,
    activePreviewTab,
    setActivePreviewTab,
    notifications,
    addNotification,
    removeNotification,
    commandHistory,
    addCommand,
    updateCommand,
    clearCommandHistory,
    memoryBankStatus,
    setMemoryBankStatus,
    refreshMemoryBankStatus,
  };

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDevContext() {
  const context = useContext(DevContext);
  if (context === undefined) {
    throw new Error("useDevContext must be used within a DevContextProvider");
  }
  return context;
}
