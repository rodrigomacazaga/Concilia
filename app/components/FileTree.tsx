'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, RefreshCw, Plus, Trash2 } from 'lucide-react';

interface FileTreeProps {
  projectId?: string;
  basePath?: string;
  onFileSelect?: (path: string) => void;
  selectedFile?: string;
  editable?: boolean;
}

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  extension?: string;
  size?: number;
  children?: TreeNode[];
  loaded?: boolean;
}

// Iconos por extensión
const getFileIcon = (extension?: string) => {
  const iconColors: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-400',
    js: 'text-yellow-500',
    jsx: 'text-yellow-400',
    json: 'text-green-500',
    md: 'text-gray-500',
    css: 'text-pink-500',
    scss: 'text-pink-400',
    html: 'text-orange-500',
    py: 'text-green-600',
    go: 'text-cyan-500',
  };

  return iconColors[extension || ''] || 'text-gray-400';
};

export function FileTree({ projectId, basePath = '.', onFileSelect, selectedFile, editable = false }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['.']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    try {
      const res = await fetch('/api/files/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al cargar directorio');
      }

      return data.entries.map((entry: any) => ({
        name: entry.name,
        type: entry.type,
        path: entry.path,
        extension: entry.extension,
        size: entry.size,
        children: entry.type === 'directory' ? [] : undefined,
        loaded: false,
      }));
    } catch (err: any) {
      console.error('Error loading directory:', err);
      throw err;
    }
  }, []);

  // Cargar raíz al montar
  useEffect(() => {
    const loadRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        const rootEntries = await loadDirectory(basePath);
        setTree(rootEntries);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    };

    loadRoot();
  }, [basePath, loadDirectory]);

  const toggleExpand = async (nodePath: string) => {
    const newExpanded = new Set(expanded);

    if (expanded.has(nodePath)) {
      newExpanded.delete(nodePath);
    } else {
      newExpanded.add(nodePath);

      // Cargar hijos si no están cargados
      const node = findNode(tree, nodePath);
      if (node && node.type === 'directory' && !node.loaded) {
        try {
          const children = await loadDirectory(nodePath);
          setTree((prev) => updateNodeChildren(prev, nodePath, children));
        } catch (err) {
          console.error('Error loading children:', err);
        }
      }
    }

    setExpanded(newExpanded);
  };

  const findNode = (nodes: TreeNode[], targetPath: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.path === targetPath) return node;
      if (node.children) {
        const found = findNode(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const updateNodeChildren = (nodes: TreeNode[], targetPath: string, children: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children, loaded: true };
      }
      if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setExpanded(new Set(['.']));
    try {
      const rootEntries = await loadDirectory(basePath);
      setTree(rootEntries);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, nodePath: string) => {
    e.stopPropagation();

    if (!confirm(`¿Estás seguro de eliminar "${nodePath}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/files/delete?path=${encodeURIComponent(nodePath)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Recargar árbol
        await handleRefresh();
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path}>
        <div
          className={`group flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-gray-100 rounded transition-colors ${
            isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleExpand(node.path);
            } else {
              onFileSelect?.(node.path);
            }
          }}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-4 flex-shrink-0" />
              <File className={`w-4 h-4 flex-shrink-0 ${getFileIcon(node.extension)}`} />
            </>
          )}
          <span className="text-sm truncate flex-1">{node.name}</span>

          {editable && (
            <button
              onClick={(e) => handleDelete(e, node.path)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>

        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.length === 0 && node.loaded ? (
              <div
                className="text-xs text-gray-400 italic py-1"
                style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}
              >
                (vacío)
              </div>
            ) : (
              node.children.map((child) => renderNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading && tree.length === 0) {
    return (
      <div className="p-4 text-center">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
        <p className="text-sm text-gray-500 mt-2">Cargando archivos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <span className="font-medium text-gray-700">Archivos</span>
        <div className="flex items-center gap-1">
          {editable && (
            <button
              className="p-1 hover:bg-gray-200 rounded"
              title="Nuevo archivo"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-200 rounded"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No hay archivos
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}

export default FileTree;
