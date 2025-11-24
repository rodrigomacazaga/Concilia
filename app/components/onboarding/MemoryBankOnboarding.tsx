"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingData {
  projectName: string;
  problem: string;
  targetUser: string;
  stack: {
    frontend: string;
    backend: string;
    database: string;
    styling: string;
  };
  decisions: Array<{
    title: string;
    context: string;
    rationale: string;
  }>;
}

interface MemoryBankOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function MemoryBankOnboarding({ onComplete, onSkip }: MemoryBankOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    projectName: "",
    problem: "",
    targetUser: "",
    stack: {
      frontend: "",
      backend: "",
      database: "",
      styling: "",
    },
    decisions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      title: "Nombre del Proyecto",
      description: "¿Cómo se llama tu proyecto?",
      field: "projectName",
      placeholder: "Ej: Mi App de Tareas",
    },
    {
      title: "Problema que Resuelve",
      description: "¿Qué problema resuelve tu proyecto?",
      field: "problem",
      placeholder: "Ej: Ayuda a equipos a organizar tareas y colaborar de forma eficiente",
      multiline: true,
    },
    {
      title: "Usuario Objetivo",
      description: "¿Para quién es este proyecto?",
      field: "targetUser",
      placeholder: "Ej: Equipos remotos de 5-20 personas que necesitan coordinación",
      multiline: true,
    },
    {
      title: "Stack Tecnológico",
      description: "¿Qué tecnologías estás usando?",
      field: "stack",
      subfields: [
        { key: "frontend", label: "Frontend", placeholder: "Ej: React, Next.js 14" },
        { key: "backend", label: "Backend", placeholder: "Ej: Node.js, API Routes" },
        { key: "database", label: "Database", placeholder: "Ej: PostgreSQL, Prisma" },
        { key: "styling", label: "Styling", placeholder: "Ej: Tailwind CSS" },
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/memory-bank/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        onComplete();
      } else {
        alert("Error al inicializar Memory Bank: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al inicializar Memory Bank");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateData = (field: string, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateStackData = (key: string, value: string) => {
    setData((prev) => ({
      ...prev,
      stack: { ...prev.stack, [key]: value },
    }));
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed =
    currentStepData.field === "stack"
      ? Object.values(data.stack).some((v) => v.trim().length > 0)
      : (data as any)[currentStepData.field]?.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-claude-orange to-orange-500 text-white px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Inicializar Memory Bank</h2>
            </div>
            <button
              onClick={onSkip}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/90">
            Ayúdame a conocer tu proyecto para brindarte mejor asistencia
          </p>
        </div>

        {/* Progress */}
        <div className="px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Paso {currentStep + 1} de {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-claude-orange rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 overflow-y-auto" style={{ maxHeight: "calc(90vh - 300px)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-600 mb-6">{currentStepData.description}</p>

              {currentStepData.field === "stack" ? (
                <div className="space-y-4">
                  {currentStepData.subfields?.map((subfield) => (
                    <div key={subfield.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {subfield.label}
                      </label>
                      <input
                        type="text"
                        value={data.stack[subfield.key as keyof typeof data.stack]}
                        onChange={(e) => updateStackData(subfield.key, e.target.value)}
                        placeholder={subfield.placeholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-orange focus:border-transparent transition-all"
                      />
                    </div>
                  ))}
                </div>
              ) : currentStepData.multiline ? (
                <textarea
                  value={(data as any)[currentStepData.field] || ""}
                  onChange={(e) => updateData(currentStepData.field, e.target.value)}
                  placeholder={currentStepData.placeholder}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-orange focus:border-transparent transition-all resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={(data as any)[currentStepData.field] || ""}
                  onChange={(e) => updateData(currentStepData.field, e.target.value)}
                  placeholder={currentStepData.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-orange focus:border-transparent transition-all"
                  autoFocus
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Saltar por ahora
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-claude-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                "Guardando..."
              ) : isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Completar
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
