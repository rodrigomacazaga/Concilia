"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  FileCode,
  TestTube,
  Bug,
  Package,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  failures: Array<{
    name: string;
    message: string;
    file?: string;
  }>;
}

interface TypeCheckResult {
  success: boolean;
  errorCount: number;
  errors: Array<{
    file: string;
    line: number;
    message: string;
  }>;
}

interface LintResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  errors: Array<{
    file: string;
    line: number;
    rule: string;
    message: string;
    severity: "error" | "warning";
  }>;
}

interface BuildResult {
  success: boolean;
  duration: number;
  errors: string[];
}

interface DependencyCheck {
  name: string;
  type: "api" | "table" | "component" | "type" | "service" | "hook" | "util";
  exists: boolean;
  path?: string;
}

interface ValidationResult {
  isValid: boolean;
  tests?: TestResult;
  typeCheck?: TypeCheckResult;
  lint?: LintResult;
  build?: BuildResult;
  dependencies?: DependencyCheck[];
  timestamp: string;
}

interface ValidationPanelProps {
  result?: ValidationResult;
  isLoading?: boolean;
  onRerun?: () => void;
  onRunTests?: () => void;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function ValidationPanel({
  result,
  isLoading = false,
  onRerun,
  onRunTests,
  compact = false,
}: ValidationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["tests", "types", "dependencies"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (!result && !isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center text-gray-500 text-sm">
        No hay resultados de validación disponibles
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Ejecutando validación...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const overallStatus = result.isValid ? "success" : "error";

  return (
    <div
      className={`bg-white rounded-lg border ${
        overallStatus === "success" ? "border-green-200" : "border-red-200"
      } overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          overallStatus === "success" ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2">
          {overallStatus === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span
            className={`font-medium ${
              overallStatus === "success" ? "text-green-800" : "text-red-800"
            }`}
          >
            {overallStatus === "success"
              ? "Validación Exitosa"
              : "Validación Fallida"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRunTests && (
            <button
              onClick={onRunTests}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <TestTube className="w-3 h-3" />
              Tests
            </button>
          )}
          {onRerun && (
            <button
              onClick={onRerun}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Revalidar
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-gray-100 bg-gray-50">
          <QuickStat
            icon={TestTube}
            label="Tests"
            value={
              result.tests
                ? `${result.tests.passed}/${result.tests.passed + result.tests.failed}`
                : "-"
            }
            status={
              result.tests
                ? result.tests.failed === 0
                  ? "success"
                  : "error"
                : "neutral"
            }
          />
          <QuickStat
            icon={FileCode}
            label="Types"
            value={
              result.typeCheck
                ? result.typeCheck.errorCount === 0
                  ? "OK"
                  : `${result.typeCheck.errorCount}`
                : "-"
            }
            status={
              result.typeCheck
                ? result.typeCheck.success
                  ? "success"
                  : "error"
                : "neutral"
            }
          />
          <QuickStat
            icon={Bug}
            label="Lint"
            value={
              result.lint
                ? result.lint.errorCount === 0
                  ? "OK"
                  : `${result.lint.errorCount}`
                : "-"
            }
            status={
              result.lint
                ? result.lint.success
                  ? "success"
                  : "error"
                : "neutral"
            }
          />
          <QuickStat
            icon={Package}
            label="Build"
            value={
              result.build
                ? result.build.success
                  ? "OK"
                  : "Error"
                : "-"
            }
            status={
              result.build
                ? result.build.success
                  ? "success"
                  : "error"
                : "neutral"
            }
          />
        </div>
      )}

      {/* Detailed Sections */}
      <div className="divide-y divide-gray-100">
        {/* Tests Section */}
        {result.tests && (
          <CollapsibleSection
            title="Tests"
            icon={TestTube}
            isExpanded={expandedSections.has("tests")}
            onToggle={() => toggleSection("tests")}
            status={result.tests.failed === 0 ? "success" : "error"}
            summary={`${result.tests.passed} passed, ${result.tests.failed} failed`}
          >
            <div className="space-y-2">
              {/* Test Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">
                  ✓ {result.tests.passed} passed
                </span>
                <span className="text-red-600">
                  ✕ {result.tests.failed} failed
                </span>
                {result.tests.skipped > 0 && (
                  <span className="text-gray-500">
                    ○ {result.tests.skipped} skipped
                  </span>
                )}
                <span className="text-gray-400">
                  {result.tests.duration}ms
                </span>
              </div>

              {/* Coverage */}
              {result.tests.coverage !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Coverage:</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        result.tests.coverage >= 80
                          ? "bg-green-500"
                          : result.tests.coverage >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${result.tests.coverage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {result.tests.coverage}%
                  </span>
                </div>
              )}

              {/* Failures */}
              {result.tests.failures.length > 0 && (
                <div className="mt-2 space-y-2">
                  <span className="text-xs font-medium text-red-700">
                    Failures:
                  </span>
                  {result.tests.failures.map((failure, idx) => (
                    <div
                      key={idx}
                      className="bg-red-50 rounded p-2 text-xs border border-red-100"
                    >
                      <div className="font-medium text-red-800">
                        {failure.name}
                      </div>
                      <div className="text-red-600 mt-1">{failure.message}</div>
                      {failure.file && (
                        <div className="text-red-400 mt-1">{failure.file}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Type Check Section */}
        {result.typeCheck && (
          <CollapsibleSection
            title="Type Check"
            icon={FileCode}
            isExpanded={expandedSections.has("types")}
            onToggle={() => toggleSection("types")}
            status={result.typeCheck.success ? "success" : "error"}
            summary={
              result.typeCheck.success
                ? "No errors"
                : `${result.typeCheck.errorCount} errors`
            }
          >
            {result.typeCheck.errors.length > 0 && (
              <div className="space-y-2">
                {result.typeCheck.errors.slice(0, 5).map((error, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 rounded p-2 text-xs border border-red-100"
                  >
                    <div className="font-mono text-red-800">
                      {error.file}:{error.line}
                    </div>
                    <div className="text-red-600 mt-1">{error.message}</div>
                  </div>
                ))}
                {result.typeCheck.errors.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    ... y {result.typeCheck.errors.length - 5} errores más
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Lint Section */}
        {result.lint && (
          <CollapsibleSection
            title="Lint"
            icon={Bug}
            isExpanded={expandedSections.has("lint")}
            onToggle={() => toggleSection("lint")}
            status={result.lint.success ? "success" : "error"}
            summary={
              result.lint.success
                ? "No issues"
                : `${result.lint.errorCount} errors, ${result.lint.warningCount} warnings`
            }
          >
            {result.lint.errors.length > 0 && (
              <div className="space-y-2">
                {result.lint.errors.slice(0, 5).map((error, idx) => (
                  <div
                    key={idx}
                    className={`rounded p-2 text-xs border ${
                      error.severity === "error"
                        ? "bg-red-50 border-red-100"
                        : "bg-yellow-50 border-yellow-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">
                        {error.file}:{error.line}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          error.severity === "error"
                            ? "bg-red-200 text-red-800"
                            : "bg-yellow-200 text-yellow-800"
                        }`}
                      >
                        {error.rule}
                      </span>
                    </div>
                    <div className="mt-1">{error.message}</div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Dependencies Section */}
        {result.dependencies && result.dependencies.length > 0 && (
          <CollapsibleSection
            title="Dependencies"
            icon={Package}
            isExpanded={expandedSections.has("dependencies")}
            onToggle={() => toggleSection("dependencies")}
            status={
              result.dependencies.every((d) => d.exists) ? "success" : "error"
            }
            summary={`${result.dependencies.filter((d) => d.exists).length}/${
              result.dependencies.length
            } found`}
          >
            <div className="grid grid-cols-2 gap-2">
              {result.dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded text-xs ${
                    dep.exists ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {dep.exists ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">{dep.name}</div>
                    <div className="text-gray-500 text-[10px]">{dep.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Build Section */}
        {result.build && !result.build.success && (
          <CollapsibleSection
            title="Build"
            icon={Package}
            isExpanded={expandedSections.has("build")}
            onToggle={() => toggleSection("build")}
            status="error"
            summary="Build failed"
          >
            <div className="space-y-2">
              {result.build.errors.map((error, idx) => (
                <div
                  key={idx}
                  className="bg-red-50 rounded p-2 text-xs border border-red-100 font-mono"
                >
                  {error}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        Validado: {new Date(result.timestamp).toLocaleString("es-ES")}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface QuickStatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status: "success" | "error" | "neutral";
}

function QuickStat({ icon: Icon, label, value, status }: QuickStatProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100">
      <Icon
        className={`w-4 h-4 ${
          status === "success"
            ? "text-green-500"
            : status === "error"
            ? "text-red-500"
            : "text-gray-400"
        }`}
      />
      <div>
        <div className="text-[10px] text-gray-500 uppercase">{label}</div>
        <div
          className={`text-sm font-medium ${
            status === "success"
              ? "text-green-700"
              : status === "error"
              ? "text-red-700"
              : "text-gray-700"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  status: "success" | "error" | "neutral";
  summary: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  status,
  summary,
  children,
}: CollapsibleSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Icon
            className={`w-4 h-4 ${
              status === "success"
                ? "text-green-500"
                : status === "error"
                ? "text-red-500"
                : "text-gray-400"
            }`}
          />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span
          className={`text-xs ${
            status === "success"
              ? "text-green-600"
              : status === "error"
              ? "text-red-600"
              : "text-gray-500"
          }`}
        >
          {summary}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
