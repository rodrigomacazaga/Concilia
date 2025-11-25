"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Plus,
  RefreshCw,
  GitBranch,
  BookOpen,
  Trash2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  path: string;
  gitUrl?: string;
  description?: string;
  memoryBankPath?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  onSelect: (projectId: string | null) => void;
  selected: string | null;
}

export function ProjectSelector({ onSelect, selected }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    gitUrl: "",
    description: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success && data.projects) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    setAddLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProject.name,
          path: newProject.path || undefined,
          gitUrl: newProject.gitUrl || undefined,
          description: newProject.description || undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.project) {
        setProjects([...projects, data.project]);
        setShowAddForm(false);
        setNewProject({ name: "", path: "", gitUrl: "", description: "" });
        onSelect(data.project.id);
      }
    } catch (error) {
      console.error("Error adding project:", error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p.id !== projectId));
      if (selected === projectId) {
        onSelect(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-orange-500" />
            Proyectos
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={loadProjects}
              disabled={loading}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Agregar proyecto"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAddProject} className="p-3 border-b bg-gray-50 space-y-2">
          <input
            type="text"
            placeholder="Nombre del proyecto *"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <input
            type="text"
            placeholder="Ruta local (opcional)"
            value={newProject.path}
            onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            placeholder="Git URL (opcional)"
            value={newProject.gitUrl}
            onChange={(e) => setNewProject({ ...newProject, gitUrl: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addLoading || !newProject.name.trim()}
              className="flex-1 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {addLoading ? "Agregando..." : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border text-sm rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay proyectos</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-orange-500 hover:underline"
            >
              Agregar proyecto
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group rounded-lg transition-colors ${
                  selected === project.id
                    ? "bg-orange-100"
                    : "hover:bg-gray-100"
                }`}
              >
                <button
                  onClick={() => onSelect(project.id)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-medium truncate ${
                        selected === project.id ? "text-orange-800" : "text-gray-800"
                      }`}
                    >
                      {project.name}
                    </span>
                    {selected === project.id && (
                      <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Indicators */}
                  <div className="flex items-center gap-2 mt-1">
                    {project.gitUrl && (
                      <span className="flex items-center text-xs text-gray-500">
                        <GitBranch className="w-3 h-3 mr-0.5" />
                        Git
                      </span>
                    )}
                    {project.memoryBankPath && (
                      <span className="flex items-center text-xs text-orange-500">
                        <BookOpen className="w-3 h-3 mr-0.5" />
                        MB
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                </button>

                {/* Actions (visible on hover) */}
                <div className="hidden group-hover:flex items-center gap-1 px-3 pb-2">
                  {project.path && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(project.path);
                      }}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                      title="Copiar ruta"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                    title="Eliminar proyecto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectSelector;
