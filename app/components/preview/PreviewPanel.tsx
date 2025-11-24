"use client";

import { useState } from "react";
import { Monitor, FolderTree, History, Terminal, RefreshCw, X } from "lucide-react";
import { motion } from "framer-motion";
import { useDevContext } from "@/app/lib/DevContext";
import FileExplorer from "./FileExplorer";
import ChangesList from "./ChangesList";
import CodeViewer from "./CodeViewer";
import TerminalOutput from "./TerminalOutput";

export default function PreviewPanel() {
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
      id: "preview" as const,
      label: "Preview",
      icon: Monitor,
    },
    {
      id: "files" as const,
      label: "Archivos",
      icon: FolderTree,
    },
    {
      id: "changes" as const,
      label: "Cambios",
      icon: History,
      badge: fileChanges.length > 0 ? fileChanges.length : undefined,
    },
    {
      id: "terminal" as const,
      label: "Terminal",
      icon: Terminal,
      badge: commandHistory.length > 0 ? commandHistory.length : undefined,
    },
  ];

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (previewCollapsed) {
    return (
      <div className="flex items-center justify-center bg-gray-100 border-l border-claude-border">
        <button
          onClick={() => setPreviewCollapsed(false)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Mostrar Preview
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-claude-border bg-claude-beige/20">
        <div className="flex items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePreviewTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActivePreviewTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-claude-orange border-b-2 border-claude-orange"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold text-white bg-claude-orange rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-4">
          {activePreviewTab === "preview" && (
            <button
              onClick={handleRefresh}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Refrescar preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setPreviewCollapsed(true)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Colapsar panel"
          >
            <X className="w-4 h-4" />
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
              <div className="w-1/2 overflow-auto">
                <FileExplorer />
              </div>
              {selectedFile && (
                <div className="w-1/2">
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
        </motion.div>
      </div>
    </div>
  );
}
