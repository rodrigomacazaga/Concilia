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
  ChevronDown,
  Edit3,
  AlertCircle,
  FolderSearch,
  Palette,
} from "lucide-react";
import { PRESET_THEMES, PRESET_COLORS } from "@/lib/themes";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPicker } from "./FolderPicker";
import { ProjectWizard } from "./ProjectWizard";

interface Project {
  id: string;
  name: string;
  path: string;
  gitUrl?: string;
  description?: string;
  memoryBankPath?: string;
  createdAt: string;
  updatedAt: string;
  theme?: {
    name: string;
    url?: string;
  };
}

interface MemoryBankFile {
  name: string;
  content: string;
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
    themeUrl: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  // Memory Bank state
  const [memoryBankOpen, setMemoryBankOpen] = useState(false);
  const [memoryBankFiles, setMemoryBankFiles] = useState<MemoryBankFile[]>([]);
  const [memoryBankExists, setMemoryBankExists] = useState(false);
  const [memoryBankLoading, setMemoryBankLoading] = useState(false);
  const [selectedMBFile, setSelectedMBFile] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  // Load Memory Bank when project changes
  useEffect(() => {
    if (selected) {
      loadMemoryBank(selected);
    } else {
      setMemoryBankFiles([]);
      setMemoryBankExists(false);
      setSelectedMBFile(null);
    }
  }, [selected]);

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

  const loadMemoryBank = async (projectId: string) => {
    setMemoryBankLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/memory-bank?cache=false`);
      const data = await response.json();

      if (data.success && data.exists) {
        setMemoryBankExists(true);
        const files = Object.entries(data.files || {}).map(([name, content]) => ({
          name,
          content: content as string,
        }));
        setMemoryBankFiles(files);
      } else {
        setMemoryBankExists(false);
        setMemoryBankFiles([]);
      }
    } catch (error) {
      console.error("Error loading memory bank:", error);
      setMemoryBankExists(false);
    } finally {
      setMemoryBankLoading(false);
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
          themeUrl: newProject.themeUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.project) {
        setProjects([...projects, data.project]);
        setShowAddForm(false);
        setNewProject({ name: "", path: "", gitUrl: "", description: "", themeUrl: "" });
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

  const handleSelectMBFile = (fileName: string) => {
    const file = memoryBankFiles.find((f) => f.name === fileName);
    if (file) {
      setSelectedMBFile(fileName);
      setEditingContent(file.content);
    }
  };

  const handleSaveMBFile = async () => {
    if (!selected || !selectedMBFile) return;

    setIsSaving(true);
    try {
      await fetch(`/api/projects/${selected}/memory-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: selectedMBFile,
          content: editingContent,
        }),
      });

      // Reload memory bank
      await loadMemoryBank(selected);
    } catch (error) {
      console.error("Error saving memory bank file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selected);

  // Handler for wizard completion
  const handleWizardComplete = async (projectData: {
    name: string;
    path?: string;
    gitUrl?: string;
    description?: string;
    themeUrl?: string;
    memoryBankFiles?: { name: string; content: string }[];
  }) => {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });

    const data = await response.json();

    if (data.success && data.project) {
      setProjects([...projects, data.project]);
      onSelect(data.project.id);
    } else {
      throw new Error(data.error || "Error al crear proyecto");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
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
              onClick={() => setShowWizard(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Agregar proyecto"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected project with Memory Bank dropdown */}
      {selectedProject && (
        <div className="border-b bg-orange-50">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800 truncate">
                  {selectedProject.name}
                </span>
              </div>
              <button
                onClick={() => {
                  onSelect(null);
                  setMemoryBankOpen(false);
                }}
                className="text-xs text-orange-600 hover:text-orange-800"
              >
                Cambiar
              </button>
            </div>

            {/* Memory Bank dropdown trigger */}
            <button
              onClick={() => setMemoryBankOpen(!memoryBankOpen)}
              disabled={memoryBankLoading}
              className="mt-2 w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md
                       bg-white border border-orange-200 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-gray-700">
                  {memoryBankLoading
                    ? "Cargando..."
                    : memoryBankExists
                    ? `Memory Bank (${memoryBankFiles.length} archivos)`
                    : "Sin Memory Bank"}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  memoryBankOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Memory Bank dropdown content */}
          <AnimatePresence>
            {memoryBankOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-orange-200"
              >
                <div className="bg-white max-h-64 overflow-y-auto">
                  {!memoryBankExists ? (
                    <div className="p-3 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        No hay Memory Bank
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Crea una carpeta <code className="bg-gray-100 px-1 rounded">memory-bank/</code> en el proyecto
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {memoryBankFiles.map((file) => (
                        <button
                          key={file.name}
                          onClick={() => handleSelectMBFile(file.name)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                            selectedMBFile === file.name ? "bg-orange-50" : ""
                          }`}
                        >
                          <BookOpen
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              file.name === "META-MEMORY-BANK.md"
                                ? "text-orange-500"
                                : "text-gray-400"
                            }`}
                          />
                          <span className="truncate">
                            {file.name.replace(".md", "")}
                          </span>
                          <Edit3 className="w-3 h-3 ml-auto text-gray-300" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Editor inline */}
                  {selectedMBFile && (
                    <div className="border-t p-2 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          {selectedMBFile}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedMBFile(null)}
                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveMBFile}
                            disabled={isSaving}
                            className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                          >
                            {isSaving ? "..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full h-32 text-xs font-mono border rounded p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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

          {/* Folder picker button */}
          <button
            type="button"
            onClick={() => setShowFolderPicker(true)}
            className="w-full px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2 text-left"
          >
            <FolderSearch className="w-4 h-4 text-orange-500 flex-shrink-0" />
            {newProject.path ? (
              <span className="truncate text-gray-700">{newProject.path}</span>
            ) : (
              <span className="text-gray-400">Seleccionar carpeta local...</span>
            )}
          </button>

          <input
            type="text"
            placeholder="Git URL (opcional)"
            value={newProject.gitUrl}
            onChange={(e) => setNewProject({ ...newProject, gitUrl: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          {/* Theme selector */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Tema (opcional)
            </label>
            <select
              value={newProject.themeUrl}
              onChange={(e) => setNewProject({ ...newProject, themeUrl: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="">Sin tema</option>
              <optgroup label="Temas Populares">
                {Object.entries(PRESET_THEMES).map(([name, url]) => (
                  <option key={name} value={url}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </option>
                ))}
              </optgroup>
            </select>
            {newProject.themeUrl && (() => {
              const themeName = Object.entries(PRESET_THEMES).find(([_, url]) => url === newProject.themeUrl)?.[0];
              const colors = themeName ? PRESET_COLORS[themeName] : undefined;
              return colors ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">Preview:</span>
                  {colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ) : null;
            })()}
          </div>

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

      {/* Folder Picker Modal */}
      <FolderPicker
        isOpen={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        onSelect={(path) => setNewProject({ ...newProject, path })}
        initialPath={newProject.path}
      />

      {/* Project list (only show when no project is selected) */}
      {!selected && (
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
                onClick={() => setShowWizard(true)}
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
                  className="group rounded-lg transition-colors hover:bg-gray-100"
                >
                  <button
                    onClick={() => onSelect(project.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 truncate">
                        {project.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
                      {project.theme && (
                        <span className="flex items-center text-xs text-purple-500">
                          <Palette className="w-3 h-3 mr-0.5" />
                          {project.theme.name}
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
      )}

      {/* Spacer when project is selected */}
      {selected && <div className="flex-1" />}

      {/* Project Wizard Modal */}
      <ProjectWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}

export default ProjectSelector;
