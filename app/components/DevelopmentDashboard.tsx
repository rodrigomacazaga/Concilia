"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Code,
  Server,
  FileCode,
  TestTube,
  Bug,
  TrendingUp,
  Layers,
  Zap,
  Pause,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface DevelopmentProgress {
  projectId: string;
  sessionId: string;
  startedAt: string;
  lastUpdated: string;
  features: FeatureProgress[];
  components: ComponentProgress[];
  apis: ApiProgress[];
  tests: TestProgress;
  errors: ErrorTracker;
  status: ProjectStatus;
  eta?: {
    estimatedCompletion: string;
    confidence: number;
    basedOn: string;
  };
}

interface FeatureProgress {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "testing" | "completed" | "blocked";
  progress: number;
  dependencies: string[];
  blockedBy?: string;
}

interface ComponentProgress {
  name: string;
  path: string;
  status: "planned" | "created" | "tested" | "verified";
  hasTests: boolean;
  errors: number;
}

interface ApiProgress {
  route: string;
  methods: string[];
  status: "planned" | "implemented" | "tested" | "documented";
  hasTests: boolean;
}

interface TestProgress {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  lastRun?: string;
}

interface ErrorTracker {
  console: ErrorEntry[];
  build: ErrorEntry[];
  runtime: ErrorEntry[];
  logic: ErrorEntry[];
  resolved: number;
  unresolved: number;
}

interface ErrorEntry {
  id: string;
  type: string;
  message: string;
  file?: string;
  line?: number;
  timestamp: string;
  resolved: boolean;
  resolution?: string;
}

interface ProjectStatus {
  phase: "planning" | "development" | "testing" | "review" | "completed";
  overallProgress: number;
  health: "healthy" | "at_risk" | "critical";
  blockers: string[];
}

interface CriticalQuestion {
  id: string;
  timestamp: string;
  context: string;
  question: string;
  reason: string;
  priority: "high" | "critical";
  options?: string[];
  defaultOption?: string;
  answered: boolean;
  answer?: string;
}

interface DashboardProps {
  sessionId: string;
  onAnswerQuestion?: (questionId: string, answer: string) => void;
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DevelopmentDashboard({
  sessionId,
  onAnswerQuestion,
}: DashboardProps) {
  const [progress, setProgress] = useState<DevelopmentProgress | null>(null);
  const [questions, setQuestions] = useState<CriticalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "features"])
  );
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null);

  // Fetch progress data
  const fetchProgress = useCallback(async () => {
    try {
      const [progressRes, questionsRes] = await Promise.all([
        fetch(`/api/development/progress?sessionId=${sessionId}`),
        fetch(`/api/development/questions?sessionId=${sessionId}`),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        if (data.success) {
          setProgress(data.data);
        }
      }

      if (questionsRes.ok) {
        const data = await questionsRes.json();
        if (data.success) {
          setQuestions(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Poll for updates
  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 3000);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    if (onAnswerQuestion) {
      onAnswerQuestion(questionId, answer);
    }

    try {
      await fetch("/api/development/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, answer }),
      });

      // Refresh questions
      fetchProgress();
    } catch (error) {
      console.error("Failed to answer question:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Activity className="w-12 h-12 mb-3 opacity-50" />
        <p>No active development session</p>
        <p className="text-xs mt-1">Start a development task to see progress</p>
      </div>
    );
  }

  const pendingQuestions = questions.filter((q) => !q.answered);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header with Status */}
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator status={progress.status} />
            <div>
              <div className="font-semibold text-sm">
                Development Progress
              </div>
              <div className="text-xs text-gray-400">
                Phase: {progress.status.phase}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ETA */}
            {progress.eta && (
              <div className="text-right text-xs">
                <div className="text-gray-400">ETA</div>
                <div className="text-blue-400">
                  {formatETA(progress.eta.estimatedCompletion)}
                </div>
              </div>
            )}

            {/* Overall Progress */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${progress.status.overallProgress}%` }}
                />
              </div>
              <span className="text-sm font-bold">
                {progress.status.overallProgress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Questions Alert */}
      {pendingQuestions.length > 0 && (
        <CriticalQuestionsAlert
          questions={pendingQuestions}
          onAnswer={handleAnswerQuestion}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            icon={Layers}
            label="Features"
            value={`${progress.features.filter((f) => f.status === "completed").length}/${progress.features.length}`}
            color="text-blue-400"
          />
          <StatCard
            icon={FileCode}
            label="Components"
            value={`${progress.components.filter((c) => c.status === "verified").length}/${progress.components.length}`}
            color="text-purple-400"
          />
          <StatCard
            icon={Server}
            label="APIs"
            value={`${progress.apis.filter((a) => a.status === "tested").length}/${progress.apis.length}`}
            color="text-green-400"
          />
          <StatCard
            icon={Bug}
            label="Errors"
            value={`${progress.errors.resolved}/${progress.errors.resolved + progress.errors.unresolved}`}
            color={progress.errors.unresolved > 5 ? "text-red-400" : "text-yellow-400"}
          />
        </div>

        {/* Features Progress */}
        <CollapsibleSection
          title="Features"
          icon={Zap}
          expanded={expandedSections.has("features")}
          onToggle={() => toggleSection("features")}
          badge={`${progress.features.filter((f) => f.status === "completed").length}/${progress.features.length}`}
        >
          <div className="space-y-2">
            {progress.features.map((feature) => (
              <FeatureRow key={feature.id} feature={feature} />
            ))}
            {progress.features.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-2">
                No features defined yet
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Components */}
        <CollapsibleSection
          title="Components"
          icon={FileCode}
          expanded={expandedSections.has("components")}
          onToggle={() => toggleSection("components")}
          badge={`${progress.components.length}`}
        >
          <div className="grid grid-cols-2 gap-2">
            {progress.components.map((comp, idx) => (
              <ComponentCard key={idx} component={comp} />
            ))}
            {progress.components.length === 0 && (
              <div className="col-span-2 text-sm text-gray-500 text-center py-2">
                No components created yet
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* APIs */}
        <CollapsibleSection
          title="APIs"
          icon={Server}
          expanded={expandedSections.has("apis")}
          onToggle={() => toggleSection("apis")}
          badge={`${progress.apis.length}`}
        >
          <div className="space-y-1">
            {progress.apis.map((api, idx) => (
              <ApiRow key={idx} api={api} />
            ))}
            {progress.apis.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-2">
                No APIs created yet
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Tests */}
        <CollapsibleSection
          title="Tests"
          icon={TestTube}
          expanded={expandedSections.has("tests")}
          onToggle={() => toggleSection("tests")}
          badge={
            progress.tests.total > 0
              ? `${progress.tests.passed}/${progress.tests.total}`
              : "0"
          }
        >
          <TestsPanel tests={progress.tests} />
        </CollapsibleSection>

        {/* Errors */}
        <CollapsibleSection
          title="Errors"
          icon={Bug}
          expanded={expandedSections.has("errors")}
          onToggle={() => toggleSection("errors")}
          badge={`${progress.errors.unresolved} unresolved`}
          badgeColor={progress.errors.unresolved > 5 ? "bg-red-600" : "bg-yellow-600"}
        >
          <ErrorsPanel
            errors={progress.errors}
            selectedError={selectedError}
            onSelectError={setSelectedError}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusIndicator({ status }: { status: ProjectStatus }) {
  const healthConfig = {
    healthy: { color: "bg-green-500", icon: CheckCircle, pulse: false },
    at_risk: { color: "bg-yellow-500", icon: AlertTriangle, pulse: true },
    critical: { color: "bg-red-500", icon: XCircle, pulse: true },
  };

  const config = healthConfig[status.health];
  const Icon = config.icon;

  return (
    <div className={`relative p-2 rounded-lg ${config.color} bg-opacity-20`}>
      <Icon
        className={`w-6 h-6 ${config.color.replace("bg-", "text-")} ${
          config.pulse ? "animate-pulse" : ""
        }`}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-2 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  badgeColor = "bg-gray-600",
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-sm">{title}</span>
          {badge && (
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function FeatureRow({ feature }: { feature: FeatureProgress }) {
  const statusConfig = {
    pending: { color: "bg-gray-600", icon: Clock },
    in_progress: { color: "bg-blue-600", icon: Play },
    testing: { color: "bg-yellow-600", icon: TestTube },
    completed: { color: "bg-green-600", icon: CheckCircle },
    blocked: { color: "bg-red-600", icon: Pause },
  };

  const config = statusConfig[feature.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded">
      <div className={`p-1 rounded ${config.color}`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{feature.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {feature.description}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-300`}
            style={{ width: `${feature.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-8">{feature.progress}%</span>
      </div>
    </div>
  );
}

function ComponentCard({ component }: { component: ComponentProgress }) {
  const statusColors = {
    planned: "border-gray-600 text-gray-400",
    created: "border-blue-600 text-blue-400",
    tested: "border-yellow-600 text-yellow-400",
    verified: "border-green-600 text-green-400",
  };

  return (
    <div
      className={`p-2 rounded border ${statusColors[component.status]} bg-gray-800/30`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate">{component.name}</span>
        {component.hasTests && (
          <TestTube className="w-3 h-3 text-green-400" />
        )}
      </div>
      <div className="text-[10px] text-gray-500 truncate mt-0.5">
        {component.path}
      </div>
    </div>
  );
}

function ApiRow({ api }: { api: ApiProgress }) {
  const statusColors = {
    planned: "text-gray-400",
    implemented: "text-blue-400",
    tested: "text-yellow-400",
    documented: "text-green-400",
  };

  return (
    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-800/30 rounded text-xs">
      <div className="flex items-center gap-2">
        <span className={statusColors[api.status]}>{api.route}</span>
        <div className="flex gap-1">
          {api.methods.map((m) => (
            <span
              key={m}
              className="px-1 py-0.5 bg-gray-700 rounded text-[10px]"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      {api.hasTests && <TestTube className="w-3 h-3 text-green-400" />}
    </div>
  );
}

function TestsPanel({ tests }: { tests: TestProgress }) {
  if (tests.total === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No tests run yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Test Results Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{
              width: `${(tests.passed / tests.total) * 100}%`,
            }}
          />
          <div
            className="h-full bg-red-500"
            style={{
              width: `${(tests.failed / tests.total) * 100}%`,
            }}
          />
          <div
            className="h-full bg-gray-500"
            style={{
              width: `${(tests.skipped / tests.total) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Test Stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-green-400 font-bold">{tests.passed}</div>
          <div className="text-gray-500">Passed</div>
        </div>
        <div>
          <div className="text-red-400 font-bold">{tests.failed}</div>
          <div className="text-gray-500">Failed</div>
        </div>
        <div>
          <div className="text-gray-400 font-bold">{tests.skipped}</div>
          <div className="text-gray-500">Skipped</div>
        </div>
        <div>
          <div className="text-blue-400 font-bold">{tests.coverage}%</div>
          <div className="text-gray-500">Coverage</div>
        </div>
      </div>

      {/* Last Run */}
      {tests.lastRun && (
        <div className="text-[10px] text-gray-500 text-center">
          Last run: {formatTimeAgo(tests.lastRun)}
        </div>
      )}
    </div>
  );
}

function ErrorsPanel({
  errors,
  selectedError,
  onSelectError,
}: {
  errors: ErrorTracker;
  selectedError: ErrorEntry | null;
  onSelectError: (error: ErrorEntry | null) => void;
}) {
  const allErrors = [
    ...errors.console,
    ...errors.build,
    ...errors.runtime,
    ...errors.logic,
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (allErrors.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No errors recorded
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {allErrors.slice(0, 10).map((error) => (
        <div
          key={error.id}
          onClick={() => onSelectError(selectedError?.id === error.id ? null : error)}
          className={`p-2 rounded text-xs cursor-pointer transition-colors ${
            error.resolved
              ? "bg-gray-800/30 text-gray-500"
              : "bg-red-900/20 text-red-300 hover:bg-red-900/30"
          } ${selectedError?.id === error.id ? "ring-1 ring-red-500" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {error.resolved ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className="font-medium">{error.type}</span>
            </div>
            <span className="text-[10px] text-gray-500">
              {formatTimeAgo(error.timestamp)}
            </span>
          </div>
          <div className="mt-1 truncate">{error.message}</div>
          {error.file && (
            <div className="mt-0.5 text-[10px] text-gray-500">
              {error.file}
              {error.line && `:${error.line}`}
            </div>
          )}
          {selectedError?.id === error.id && error.resolution && (
            <div className="mt-2 p-1.5 bg-green-900/20 rounded text-green-300">
              Resolution: {error.resolution}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CriticalQuestionsAlert({
  questions,
  onAnswer,
}: {
  questions: CriticalQuestion[];
  onAnswer: (questionId: string, answer: string) => void;
}) {
  const [currentAnswer, setCurrentAnswer] = useState<Record<string, string>>({});

  const criticalQuestions = questions.filter((q) => q.priority === "critical");

  if (criticalQuestions.length === 0) return null;

  return (
    <div className="p-3 bg-red-900/30 border-b border-red-700">
      <div className="flex items-center gap-2 text-red-400 mb-2">
        <HelpCircle className="w-5 h-5" />
        <span className="font-semibold">
          Agent needs your input ({criticalQuestions.length} critical question
          {criticalQuestions.length > 1 ? "s" : ""})
        </span>
      </div>

      {criticalQuestions.map((q) => (
        <div key={q.id} className="bg-gray-800/50 rounded-lg p-3 mt-2">
          <div className="text-sm text-gray-300 mb-1">{q.context}</div>
          <div className="text-white font-medium mb-2">{q.question}</div>
          <div className="text-xs text-gray-400 mb-3">
            Why this is critical: {q.reason}
          </div>

          {q.options ? (
            <div className="flex flex-wrap gap-2">
              {q.options.map((option) => (
                <button
                  key={option}
                  onClick={() => onAnswer(q.id, option)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    option === q.defaultOption
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={currentAnswer[q.id] || ""}
                onChange={(e) =>
                  setCurrentAnswer((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                placeholder="Type your answer..."
                className="flex-1 px-3 py-1.5 bg-gray-700 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => {
                  if (currentAnswer[q.id]) {
                    onAnswer(q.id, currentAnswer[q.id]);
                    setCurrentAnswer((prev) => {
                      const newState = { ...prev };
                      delete newState[q.id];
                      return newState;
                    });
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                Answer
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function formatETA(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "Overdue";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `~${diffMins}m`;
  if (diffHours < 24) return `~${diffHours}h ${diffMins % 60}m`;
  return date.toLocaleDateString();
}
