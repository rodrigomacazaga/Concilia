'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Upload,
  Sparkles,
  SkipForward,
  FileText,
  AlertCircle,
  Loader2,
  FolderSearch,
  Palette,
} from 'lucide-react';
import { WIZARD_STEPS, WizardStep, WizardQuestion, calculateCompleteness } from '@/lib/wizard-questions';
import { generateMemoryBank, generateMinimalMemoryBank } from '@/lib/memory-bank-generator';
import { FolderPicker } from './FolderPicker';
import { PRESET_THEMES, PRESET_COLORS } from '@/lib/themes';

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (projectData: {
    name: string;
    path?: string;
    gitUrl?: string;
    description?: string;
    themeUrl?: string;
    memoryBankFiles?: { name: string; content: string }[];
  }) => Promise<void>;
}

type WizardMode = 'choose' | 'quick' | 'guided' | 'upload';

export function ProjectWizard({ isOpen, onClose, onComplete }: ProjectWizardProps) {
  // Wizard state
  const [mode, setMode] = useState<WizardMode>('choose');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Project basic info
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [projectGitUrl, setProjectGitUrl] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [themeUrl, setThemeUrl] = useState('');
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedContent, setUploadedContent] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeness = calculateCompleteness(answers);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultiSelectToggle = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    handleAnswerChange(questionId, updated);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setUploadedFiles(prev => [...prev, ...fileArray]);

    // Read content of text files
    for (const file of fileArray) {
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setUploadedContent(prev => prev + `\n\n--- ${file.name} ---\n\n${text}`);
      }
    }
  }, []);

  const handleQuickCreate = async () => {
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const minimalMB = generateMinimalMemoryBank(projectName, projectDescription);

      await onComplete({
        name: projectName,
        path: projectPath || undefined,
        gitUrl: projectGitUrl || undefined,
        description: projectDescription || undefined,
        themeUrl: themeUrl || undefined,
        memoryBankFiles: minimalMB
      });

      resetWizard();
    } catch (err: any) {
      setError(err.message || 'Error al crear el proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuidedComplete = async () => {
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Add project description to answers if provided
      if (projectDescription) {
        answers['project_purpose'] = answers['project_purpose'] || projectDescription;
      }

      const result = generateMemoryBank(answers);

      await onComplete({
        name: projectName,
        path: projectPath || undefined,
        gitUrl: projectGitUrl || undefined,
        description: projectDescription || undefined,
        themeUrl: themeUrl || undefined,
        memoryBankFiles: result.files
      });

      resetWizard();
    } catch (err: any) {
      setError(err.message || 'Error al crear el proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadComplete = async () => {
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const minimalMB = generateMinimalMemoryBank(projectName, projectDescription);

      // Add uploaded content as additional file
      if (uploadedContent) {
        minimalMB.push({
          name: 'UPLOADED-DOCUMENTATION.md',
          content: `# Uploaded Documentation

${uploadedContent}
`
        });
      }

      await onComplete({
        name: projectName,
        path: projectPath || undefined,
        gitUrl: projectGitUrl || undefined,
        description: projectDescription || undefined,
        themeUrl: themeUrl || undefined,
        memoryBankFiles: minimalMB
      });

      resetWizard();
    } catch (err: any) {
      setError(err.message || 'Error al crear el proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setMode('choose');
    setCurrentStep(0);
    setAnswers({});
    setProjectName('');
    setProjectPath('');
    setProjectGitUrl('');
    setProjectDescription('');
    setThemeUrl('');
    setUploadedFiles([]);
    setUploadedContent('');
    setError(null);
    onClose();
  };

  const renderQuestion = (question: WizardQuestion) => {
    const value = answers[question.id];

    return (
      <div key={question.id} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {question.type === 'text' && (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        )}

        {question.type === 'textarea' && (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        )}

        {question.type === 'select' && (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">Seleccionar...</option>
            {question.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {question.type === 'multiselect' && (
          <div className="flex flex-wrap gap-2">
            {question.options?.map(opt => {
              const selected = ((value as string[]) || []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleMultiSelectToggle(question.id, opt)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selected
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-orange-300'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 inline mr-1" />}
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Nuevo Proyecto</h2>
            </div>
            <button onClick={resetWizard} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          {mode === 'guided' && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>Completitud del Memory Bank:</span>
                <span className="font-medium text-white">{completeness}%</span>
              </div>
              <div className="mt-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Mode Selection */}
            {mode === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-gray-600 mb-6">
                  ¿Cómo quieres configurar tu nuevo proyecto?
                </p>

                <button
                  onClick={() => setMode('quick')}
                  className="w-full p-4 border-2 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center">
                      <SkipForward className="w-5 h-5 text-gray-500 group-hover:text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Rápido</h3>
                      <p className="text-sm text-gray-500">Solo nombre y carpeta, Memory Bank básico</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMode('guided')}
                  className="w-full p-4 border-2 border-orange-200 bg-orange-50 rounded-xl hover:border-orange-400 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Guiado (Recomendado)</h3>
                      <p className="text-sm text-gray-500">Responde preguntas para crear un Memory Bank completo</p>
                    </div>
                    <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-700 text-xs rounded-full">
                      Mejor IA
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setMode('upload')}
                  className="w-full p-4 border-2 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-500 group-hover:text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Subir Documentación</h3>
                      <p className="text-sm text-gray-500">Sube tus propios documentos de especificación</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Quick Mode */}
            {mode === 'quick' && (
              <motion.div
                key="quick"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre del proyecto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Mi Proyecto"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Carpeta del proyecto</label>
                  <button
                    type="button"
                    onClick={() => setShowFolderPicker(true)}
                    className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2 text-left"
                  >
                    <FolderSearch className="w-4 h-4 text-orange-500" />
                    {projectPath ? (
                      <span className="truncate text-gray-700">{projectPath}</span>
                    ) : (
                      <span className="text-gray-400">Seleccionar carpeta...</span>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Breve descripción del proyecto..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Palette className="w-4 h-4" />
                    Tema (opcional)
                  </label>
                  <select
                    value={themeUrl}
                    onChange={(e) => setThemeUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">Sin tema</option>
                    {Object.entries(PRESET_THEMES).map(([name, url]) => (
                      <option key={name} value={url}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </option>
                    ))}
                  </select>
                  {themeUrl && (() => {
                    const themeName = Object.entries(PRESET_THEMES).find(([_, url]) => url === themeUrl)?.[0];
                    const colors = themeName ? PRESET_COLORS[themeName] : undefined;
                    return colors ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400">Preview:</span>
                        {colors.map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </motion.div>
            )}

            {/* Guided Mode */}
            {mode === 'guided' && (
              <motion.div
                key="guided"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Step 0: Project basics */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">📋</span>
                      <h3 className="text-lg font-medium">Información del Proyecto</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre del proyecto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Mi Proyecto"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Carpeta del proyecto</label>
                      <button
                        type="button"
                        onClick={() => setShowFolderPicker(true)}
                        className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2 text-left"
                      >
                        <FolderSearch className="w-4 h-4 text-orange-500" />
                        {projectPath ? (
                          <span className="truncate text-gray-700">{projectPath}</span>
                        ) : (
                          <span className="text-gray-400">Seleccionar carpeta...</span>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Palette className="w-4 h-4" />
                        Tema (opcional)
                      </label>
                      <select
                        value={themeUrl}
                        onChange={(e) => setThemeUrl(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Sin tema</option>
                        {Object.entries(PRESET_THEMES).map(([name, url]) => (
                          <option key={name} value={url}>
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Wizard Steps */}
                {currentStep > 0 && currentStep <= WIZARD_STEPS.length && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{WIZARD_STEPS[currentStep - 1].icon}</span>
                      <div>
                        <h3 className="text-lg font-medium">{WIZARD_STEPS[currentStep - 1].title}</h3>
                        <p className="text-sm text-gray-500">{WIZARD_STEPS[currentStep - 1].description}</p>
                      </div>
                      {WIZARD_STEPS[currentStep - 1].optional && (
                        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          Opcional
                        </span>
                      )}
                    </div>

                    <div className="space-y-6">
                      {WIZARD_STEPS[currentStep - 1].questions.map(q => renderQuestion(q))}
                    </div>
                  </div>
                )}

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-1 pt-4">
                  {[0, ...WIZARD_STEPS.map((_, i) => i + 1)].map((step) => (
                    <button
                      key={step}
                      onClick={() => setCurrentStep(step)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        step === currentStep
                          ? 'bg-orange-500'
                          : step < currentStep
                          ? 'bg-orange-300'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Upload Mode */}
            {mode === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre del proyecto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Mi Proyecto"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Carpeta del proyecto</label>
                  <button
                    type="button"
                    onClick={() => setShowFolderPicker(true)}
                    className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-2 text-left"
                  >
                    <FolderSearch className="w-4 h-4 text-orange-500" />
                    {projectPath ? (
                      <span className="truncate text-gray-700">{projectPath}</span>
                    ) : (
                      <span className="text-gray-400">Seleccionar carpeta...</span>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Subir documentación
                  </label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-orange-300 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      multiple
                      accept=".md,.txt,.doc,.docx,.pdf"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Arrastra archivos o <span className="text-orange-500">haz clic para seleccionar</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Soporta .md, .txt, .doc, .docx, .pdf
                      </p>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => {
              if (mode === 'choose') {
                resetWizard();
              } else if (mode === 'guided' && currentStep > 0) {
                setCurrentStep(currentStep - 1);
              } else {
                setMode('choose');
              }
            }}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            {mode === 'choose' ? 'Cancelar' : 'Atrás'}
          </button>

          <div className="flex items-center gap-2">
            {mode === 'guided' && currentStep > 0 && currentStep < WIZARD_STEPS.length && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <SkipForward className="w-4 h-4" />
                Saltar
              </button>
            )}

            {mode === 'quick' && (
              <button
                onClick={handleQuickCreate}
                disabled={isSubmitting || !projectName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Crear Proyecto
              </button>
            )}

            {mode === 'guided' && (
              currentStep < WIZARD_STEPS.length ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 0 && !projectName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGuidedComplete}
                  disabled={isSubmitting || !projectName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Crear con Memory Bank ({completeness}%)
                </button>
              )
            )}

            {mode === 'upload' && (
              <button
                onClick={handleUploadComplete}
                disabled={isSubmitting || !projectName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Crear Proyecto
              </button>
            )}
          </div>
        </div>

        {/* Folder Picker Modal */}
        <FolderPicker
          isOpen={showFolderPicker}
          onClose={() => setShowFolderPicker(false)}
          onSelect={(path) => setProjectPath(path)}
          initialPath={projectPath}
        />
      </motion.div>
    </div>
  );
}

export default ProjectWizard;
