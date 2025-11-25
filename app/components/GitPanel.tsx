"use client";

import { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Plus,
  Minus,
  File,
  AlertCircle,
  CheckCircle,
  Upload,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface GitPanelProps {
  projectId: string;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasChanges: boolean;
}

export function GitPanel({ projectId }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, [projectId]);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/git/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load git status");
      }

      if (data.success && data.status) {
        setStatus(data.status);
      } else {
        setStatus(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runGitCommand = async (command: string) => {
    setActionLoading(command);
    setOutput(null);

    try {
      const response = await fetch(`/api/git/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      if (data.stdout || data.stderr) {
        setOutput(data.stdout || data.stderr);
      }

      await loadStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStageAll = async () => {
    await runGitCommand("add .");
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;

    await runGitCommand(`commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    setCommitMessage("");
  };

  const handlePush = async () => {
    await runGitCommand("push");
  };

  const handlePull = async () => {
    await runGitCommand("pull");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-500">Cargando estado de git...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 border rounded-lg bg-red-50 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-4">
        <div className="p-4 border rounded-lg bg-amber-50 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">No Git Repository</p>
            <p className="text-sm text-amber-600">
              Este proyecto no tiene un repositorio git inicializado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con branch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-gray-800">{status.branch}</span>
          {(status.ahead > 0 || status.behind > 0) && (
            <div className="flex items-center gap-1 text-xs">
              {status.ahead > 0 && (
                <span className="flex items-center text-green-600">
                  <ArrowUp className="w-3 h-3" />
                  {status.ahead}
                </span>
              )}
              {status.behind > 0 && (
                <span className="flex items-center text-red-600">
                  <ArrowDown className="w-3 h-3" />
                  {status.behind}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refrescar"
        >
          <RefreshCw
            className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Status badge */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          status.hasChanges
            ? "bg-amber-50 text-amber-700"
            : "bg-green-50 text-green-700"
        }`}
      >
        {status.hasChanges ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Hay cambios sin commitear</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Working tree limpio</span>
          </>
        )}
      </div>

      {/* Staged files */}
      {status.staged.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 px-3 py-2 border-b flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Staged ({status.staged.length})
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {status.staged.map((file) => (
              <div
                key={file}
                className="px-3 py-1.5 text-sm text-gray-700 flex items-center gap-2 hover:bg-gray-50"
              >
                <File className="w-3.5 h-3.5 text-green-500" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unstaged files */}
      {status.unstaged.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-3 py-2 border-b flex items-center gap-2">
            <Minus className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Modificados ({status.unstaged.length})
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {status.unstaged.map((file) => (
              <div
                key={file}
                className="px-3 py-1.5 text-sm text-gray-700 flex items-center gap-2 hover:bg-gray-50"
              >
                <File className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untracked files */}
      {status.untracked.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b flex items-center gap-2">
            <File className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Sin seguimiento ({status.untracked.length})
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {status.untracked.map((file) => (
              <div
                key={file}
                className="px-3 py-1.5 text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50"
              >
                <File className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commit form */}
      {status.hasChanges && (
        <div className="space-y-2 pt-2 border-t">
          <button
            onClick={handleStageAll}
            disabled={actionLoading === "add ."}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            {actionLoading === "add ." ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Stage All
          </button>

          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Mensaje del commit..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && commitMessage.trim()) {
                handleCommit();
              }
            }}
          />

          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || actionLoading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading?.startsWith("commit") ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <GitCommit className="w-4 h-4" />
            )}
            Commit
          </button>
        </div>
      )}

      {/* Push/Pull buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={handlePull}
          disabled={actionLoading === "pull"}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
        >
          {actionLoading === "pull" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Pull
        </button>
        <button
          onClick={handlePush}
          disabled={actionLoading === "push" || status.ahead === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
        >
          {actionLoading === "push" ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Push
          {status.ahead > 0 && (
            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
              {status.ahead}
            </span>
          )}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-3 py-2 text-xs text-gray-300">
            Output
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

export default GitPanel;
