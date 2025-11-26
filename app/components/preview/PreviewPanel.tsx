"use client";

import { useState } from "react";
import {
  Monitor,
  FolderTree,
  History,
  Terminal,
  RefreshCw,
  X,
  MessageSquare,
  BookOpen,
  GitBranch,
  Server,
  Palette,
  Activity,
  Bot,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDevContext } from "@/app/lib/DevContext";
import FileExplorer from "./FileExplorer";
import ChangesList from "./ChangesList";
import CodeViewer from "./CodeViewer";
import TerminalOutput from "./TerminalOutput";
import ConversationHistory from "@/app/components/ConversationHistory";
import { MemoryBankPanel } from "@/app/components/MemoryBankPanel";
import GitPanel from "@/app/components/GitPanel";
import MCPServerPanel from "@/app/components/MCPServerPanel";
import DesignSystemPanel from "@/app/components/DesignSystemPanel";
import ObservabilityPanel from "@/app/components/ObservabilityPanel";
import AutonomousPanel from "@/app/components/AutonomousPanel";

interface PreviewPanelProps {
  projectId?: string | null;
  selectedConversation?: string | null;
  onSelectConversation?: (id: string | null) => void;
  currentService?: string | null;
  onServiceSelect?: (service: string | null) => void;
}

type TabId = "preview" | "files" | "changes" | "terminal" | "chats" | "memory-bank" | "git" | "mcp" | "design-system" | "observability" | "agent";

export default function PreviewPanel({
  projectId,
  selectedConversation,
  onSelectConversation,
  currentService,
  onServiceSelect,
}: PreviewPanelProps) {
  const {
    activePreviewTab,
    setActivePreviewTab,
    previewCollapsed,
    setPreviewCollapsed,
    selectedFile,
    fileChanges,
    commandHistory,
  } = useDevContext();

  const [iframeKey, setIframeKey] = useState(0);

  const tabs = [
    {
      id: "preview" as TabId,
      label: "Preview",
      icon: Monitor,
    },
    {
      id: "files" as TabId,
      label: "Archivos",
      icon: FolderTree,
    },
    {
      id: "changes" as TabId,
      label: "Cambios",
      icon: History,
      badge: fileChanges.length > 0 ? fileChanges.length : undefined,
    },
    {
      id: "terminal" as TabId,
      label: "Terminal",
      icon: Terminal,
      badge: commandHistory.length > 0 ? commandHistory.length : undefined,
    },
    {
      id: "chats" as TabId,
      label: "Chats",
      icon: MessageSquare,
    },
    {
      id: "memory-bank" as TabId,
      label: "MB",
      icon: BookOpen,
    },
    {
      id: "git" as TabId,
      label: "Git",
      icon: GitBranch,
    },
    {
      id: "mcp" as TabId,
      label: "MCP",
      icon: Server,
    },
    {
      id: "design-system" as TabId,
      label: "DS",
      icon: Palette,
    },
    {
      id: "observability" as TabId,
      label: "Obs",
      icon: Activity,
    },
    {
      id: "agent" as TabId,
      label: "Agent",
      icon: Bot,
    },
  ];

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (previewCollapsed) {
    return (
      <div className="flex items-center justify-center bg-gray-100 border-l border-claude-border h-full">
        <button
          onClick={() => setPreviewCollapsed(false)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Mostrar Panel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-claude-border bg-claude-beige/20">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePreviewTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActivePreviewTab(tab.id)}
                className={`relative px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-claude-orange border-b-2 border-claude-orange"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="px-1 py-0.5 text-[10px] font-semibold text-white bg-claude-orange rounded-full min-w-[16px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 px-2 flex-shrink-0">
          {activePreviewTab === "preview" && (
            <button
              onClick={handleRefresh}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Refrescar preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setPreviewCollapsed(true)}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Colapsar panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={activePreviewTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activePreviewTab === "preview" && (
            <div className="h-full bg-white">
              <iframe
                key={iframeKey}
                src="http://localhost:3000"
                className="w-full h-full border-0"
                title="Preview"
              />
            </div>
          )}

          {activePreviewTab === "files" && (
            <div className="h-full flex">
              <div className={selectedFile ? "w-1/2 overflow-auto" : "w-full overflow-auto"}>
                <FileExplorer />
              </div>
              {selectedFile && (
                <div className="w-1/2 border-l">
                  <CodeViewer
                    filePath={selectedFile.path}
                    content={selectedFile.content}
                    lastModified={selectedFile.lastModified}
                    isModified={fileChanges.some(
                      (c) => c.path === selectedFile.path
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {activePreviewTab === "changes" && <ChangesList />}

          {activePreviewTab === "terminal" && <TerminalOutput />}

          {activePreviewTab === "chats" && projectId && (
            <ConversationHistory
              projectId={projectId}
              onSelect={onSelectConversation || (() => {})}
              selected={selectedConversation || null}
            />
          )}

          {activePreviewTab === "chats" && !projectId && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Selecciona un proyecto para ver las conversaciones
            </div>
          )}

          {activePreviewTab === "memory-bank" && projectId && (
            <MemoryBankPanel
              projectId={projectId}
              currentService={currentService}
              onServiceSelect={onServiceSelect}
            />
          )}

          {activePreviewTab === "memory-bank" && !projectId && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Selecciona un proyecto para ver el Memory Bank
            </div>
          )}

          {activePreviewTab === "git" && projectId && (
            <div className="h-full overflow-y-auto p-4">
              <GitPanel projectId={projectId} />
            </div>
          )}

          {activePreviewTab === "git" && !projectId && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Selecciona un proyecto para ver Git
            </div>
          )}

          {activePreviewTab === "mcp" && (
            <MCPServerPanel projectId={projectId} />
          )}

          {activePreviewTab === "design-system" && (
            <DesignSystemPanel projectId={projectId} />
          )}

          {activePreviewTab === "observability" && (
            <ObservabilityPanel />
          )}

          {activePreviewTab === "agent" && (
            <AutonomousPanel />
          )}
        </motion.div>
      </div>
    </div>
  );
}
