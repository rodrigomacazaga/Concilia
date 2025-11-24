"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevContext } from "@/app/lib/DevContext";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
}

interface FileTreeNodeProps {
  entry: FileEntry;
  level: number;
  onFileClick: (path: string) => void;
}

function FileTreeNode({ entry, level, onFileClick }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { fileChanges, selectedFile } = useDevContext();

  const isModified = fileChanges.some((change) => change.path === entry.path);
  const isSelected = selectedFile?.path === entry.path;

  const loadChildren = async () => {
    if (entry.type !== "directory") return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/files/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path }),
      });

      const data = await response.json();
      if (data.success) {
        setChildren(data.entries);
      }
    } catch (error) {
      console.error("Error loading directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (entry.type === "directory") {
      if (!isExpanded && children.length === 0) {
        loadChildren();
      }
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(entry.path);
    }
  };

  const getFileIcon = () => {
    if (entry.type === "directory") {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      );
    }

    // Iconos por extensión
    const ext = entry.extension?.toLowerCase();
    if (ext === "json") return <FileJson className="w-4 h-4 text-yellow-600" />;
    if (["ts", "tsx", "js", "jsx"].includes(ext || ""))
      return <FileCode className="w-4 h-4 text-blue-600" />;
    if (["md", "txt"].includes(ext || ""))
      return <FileText className="w-4 h-4 text-gray-600" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div>
      {/* Entry */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors ${
          isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {/* Chevron para directorios */}
        <div className="w-4 h-4 flex-shrink-0">
          {entry.type === "directory" && (
            <>
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </>
          )}
        </div>

        {/* Icono */}
        {getFileIcon()}

        {/* Nombre */}
        <span
          className={`text-sm flex-1 truncate ${
            isSelected ? "font-semibold text-blue-700" : "text-gray-700"
          }`}
        >
          {entry.name}
        </span>

        {/* Badge de modificado */}
        {isModified && (
          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
        )}
      </motion.div>

      {/* Children (si es directorio expandido) */}
      <AnimatePresence>
        {entry.type === "directory" && isExpanded && children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                level={level + 1}
                onFileClick={onFileClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FileExplorer() {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setSelectedFile } = useDevContext();

  useEffect(() => {
    loadRootDirectory();
  }, []);

  const loadRootDirectory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/files/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "." }),
      });

      const data = await response.json();
      if (data.success) {
        setRootEntries(data.entries);
      }
    } catch (error) {
      console.error("Error loading root directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (path: string) => {
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

  return (
    <div className="flex flex-col h-full bg-white border-l border-claude-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-claude-border bg-claude-beige/30">
        <h3 className="text-sm font-semibold text-gray-900">Explorador de Archivos</h3>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="py-2">
            {rootEntries.map((entry) => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                level={0}
                onFileClick={handleFileClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
