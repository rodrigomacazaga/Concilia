"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  List,
  Settings,
  ChevronRight,
  ChevronDown,
  Loader2,
  Heart,
  Shield,
  Bot,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface AgentState {
  status: string;
  isHealthy: boolean;
  lastHealthCheck: string;
  consecutiveFailures: number;
  lastActivity: string;
  currentPlan: {
    id: string;
    title: string;
    status: string;
    progress: {
      total: number;
      completed: number;
      failed: number;
      blocked: number;
    };
    currentIteration: number;
  } | null;
  currentTask: {
    id: string;
    title: string;
    status: string;
    attempts: number;
  } | null;
  recentActivity: ActivityEntry[];
}

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "info" | "action" | "error" | "recovery" | "milestone";
  message: string;
}

interface HealthData {
  status: {
    overall: string;
    checks: HealthCheck[];
    uptime: number;
    consecutiveFailures: number;
  };
  triggers: Trigger[];
}

interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  responseTime?: number;
}

interface Trigger {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  triggerCount: number;
  lastTriggered?: string;
}

// ============================================================================
// AutonomousPanel Component
// ============================================================================

export default function AutonomousPanel() {
  const [activeTab, setActiveTab] = useState<"status" | "activity" | "health" | "triggers">("status");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["progress", "task"]));

  // Fetch agent state
  const fetchAgentState = useCallback(async () => {
    try {
      const response = await fetch("/api/autonomous?action=state");
      const data = await response.json();
      if (data.success) {
        setAgentState(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch agent state:", error);
    }
  }, []);

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    try {
      const response = await fetch("/api/autonomous?action=health");
      const data = await response.json();
      if (data.success) {
        setHealthData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAgentState(), fetchHealthData()]);
      setLoading(false);
    };

    loadData();
    const interval = setInterval(() => {
      fetchAgentState();
      fetchHealthData();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchAgentState, fetchHealthData]);

  // Agent actions
  const executeAction = async (action: string, params: Record<string, unknown> = {}) => {
    setActionLoading(action);
    try {
      const response = await fetch("/api/autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error("Action failed:", data.error);
      }
      await fetchAgentState();
    } catch (error) {
      console.error("Action error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <span className="font-semibold">Autonomous Agent</span>
          <StatusBadge status={agentState?.status || "idle"} />
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            icon={Play}
            label="Start"
            onClick={() => executeAction("resume")}
            disabled={agentState?.status === "developing" || agentState?.status === "testing"}
            loading={actionLoading === "resume"}
          />
          <ActionButton
            icon={Pause}
            label="Pause"
            onClick={() => executeAction("pause")}
            disabled={agentState?.status !== "developing" && agentState?.status !== "testing"}
            loading={actionLoading === "pause"}
          />
          <ActionButton
            icon={Square}
            label="Stop"
            onClick={() => executeAction("stop")}
            variant="danger"
            loading={actionLoading === "stop"}
          />
          <ActionButton
            icon={RefreshCw}
            label="Recover"
            onClick={() => executeAction("recover", { reason: "Manual trigger" })}
            variant="warning"
            loading={actionLoading === "recover"}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: "status", label: "Status", icon: Activity },
          { id: "activity", label: "Activity", icon: List },
          { id: "health", label: "Health", icon: Heart },
          { id: "triggers", label: "Triggers", icon: Zap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800/50"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "status" && (
          <StatusTab
            agentState={agentState}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}
        {activeTab === "activity" && <ActivityTab activity={agentState?.recentActivity || []} />}
        {activeTab === "health" && <HealthTab healthData={healthData} />}
        {activeTab === "triggers" && (
          <TriggersTab
            triggers={healthData?.triggers || []}
            onToggle={(id, enabled) =>
              executeAction("toggleTrigger", { triggerId: id, enabled })
            }
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    idle: { color: "bg-gray-600", icon: Clock },
    planning: { color: "bg-blue-600", icon: Target },
    developing: { color: "bg-green-600 animate-pulse", icon: Activity },
    testing: { color: "bg-yellow-600", icon: CheckCircle },
    reviewing: { color: "bg-purple-600", icon: Activity },
    recovering: { color: "bg-orange-600 animate-pulse", icon: RefreshCw },
    paused: { color: "bg-gray-500", icon: Pause },
    completed: { color: "bg-green-500", icon: CheckCircle },
    failed: { color: "bg-red-600", icon: AlertTriangle },
  };

  const { color, icon: Icon } = config[status] || config.idle;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "danger" | "warning";
}) {
  const variants = {
    default: "bg-gray-700 hover:bg-gray-600 text-gray-200",
    danger: "bg-red-900/50 hover:bg-red-800/50 text-red-300",
    warning: "bg-orange-900/50 hover:bg-orange-800/50 text-orange-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${variants[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      title={label}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatusTab({
  agentState,
  expandedSections,
  toggleSection,
}: {
  agentState: AgentState | null;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}) {
  if (!agentState) return <div className="text-gray-500">No data available</div>;

  const plan = agentState.currentPlan;
  const task = agentState.currentTask;

  return (
    <div className="space-y-4">
      {/* Progress Section */}
      {plan && (
        <CollapsibleSection
          title="Development Progress"
          icon={Target}
          expanded={expandedSections.has("progress")}
          onToggle={() => toggleSection("progress")}
        >
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-400 mb-1">{plan.title}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Iteration {plan.currentIteration}</span>
                <span>•</span>
                <StatusBadge status={plan.status} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Progress</span>
                <span className="text-gray-300">
                  {plan.progress.completed}/{plan.progress.total} tasks
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{
                    width: `${(plan.progress.completed / Math.max(plan.progress.total, 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-green-400">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  {plan.progress.completed} completed
                </span>
                <span className="text-red-400">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {plan.progress.failed} failed
                </span>
                <span className="text-yellow-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {plan.progress.blocked} blocked
                </span>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Current Task */}
      {task && (
        <CollapsibleSection
          title="Current Task"
          icon={Activity}
          expanded={expandedSections.has("task")}
          onToggle={() => toggleSection("task")}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-200">{task.title}</div>
            <div className="flex items-center gap-3 text-xs">
              <StatusBadge status={task.status} />
              <span className="text-gray-500">Attempt {task.attempts}</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Agent Stats */}
      <CollapsibleSection
        title="Agent Stats"
        icon={Bot}
        expanded={expandedSections.has("stats")}
        onToggle={() => toggleSection("stats")}
      >
        <div className="grid grid-cols-2 gap-3 text-xs">
          <StatCard
            label="Health"
            value={agentState.isHealthy ? "Healthy" : "Unhealthy"}
            icon={Heart}
            color={agentState.isHealthy ? "text-green-400" : "text-red-400"}
          />
          <StatCard
            label="Failures"
            value={agentState.consecutiveFailures.toString()}
            icon={AlertTriangle}
            color={agentState.consecutiveFailures > 0 ? "text-yellow-400" : "text-gray-400"}
          />
          <StatCard
            label="Last Activity"
            value={formatTimeAgo(agentState.lastActivity)}
            icon={Clock}
            color="text-blue-400"
          />
          <StatCard
            label="Last Health Check"
            value={formatTimeAgo(agentState.lastHealthCheck)}
            icon={Shield}
            color="text-purple-400"
          />
        </div>
      </CollapsibleSection>

      {/* No plan message */}
      {!plan && (
        <div className="text-center py-8 text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No active development plan</p>
          <p className="text-xs mt-1">Create a plan to start autonomous development</p>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEntry[] }) {
  const typeConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    info: { color: "text-blue-400", icon: Activity },
    action: { color: "text-green-400", icon: Zap },
    error: { color: "text-red-400", icon: AlertTriangle },
    recovery: { color: "text-orange-400", icon: RefreshCw },
    milestone: { color: "text-purple-400", icon: Target },
  };

  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activity.map((entry) => {
        const config = typeConfig[entry.type] || typeConfig.info;
        return (
          <div
            key={entry.id}
            className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-800/50"
          >
            <config.icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 truncate">{entry.message}</div>
              <div className="text-xs text-gray-500">{formatTime(entry.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HealthTab({ healthData }: { healthData: HealthData | null }) {
  if (!healthData) {
    return <div className="text-gray-500">No health data available</div>;
  }

  const { status } = healthData;
  const overallColor = {
    healthy: "text-green-400",
    degraded: "text-yellow-400",
    unhealthy: "text-orange-400",
    critical: "text-red-400",
  }[status.overall] || "text-gray-400";

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Heart className={`w-5 h-5 ${overallColor}`} />
          <span className="font-medium">Overall Health</span>
        </div>
        <span className={`text-lg font-bold ${overallColor} capitalize`}>{status.overall}</span>
      </div>

      {/* Uptime */}
      <div className="text-xs text-gray-500">
        Uptime: {formatDuration(status.uptime)} • Consecutive Failures: {status.consecutiveFailures}
      </div>

      {/* Health Checks */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-400">Health Checks</div>
        {status.checks.map((check, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  check.status === "pass"
                    ? "bg-green-500"
                    : check.status === "warn"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-300">{check.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {check.responseTime && (
                <span className="text-gray-500">{check.responseTime}ms</span>
              )}
              <span
                className={
                  check.status === "pass"
                    ? "text-green-400"
                    : check.status === "warn"
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              >
                {check.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TriggersTab({
  triggers,
  onToggle,
}: {
  triggers: Trigger[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  if (triggers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No triggers configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 mb-3">
        Auto-triggers activate recovery actions based on system conditions
      </div>
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className={`flex items-center justify-between p-3 rounded-lg border ${
            trigger.enabled
              ? "bg-gray-800/50 border-gray-700"
              : "bg-gray-900/50 border-gray-800 opacity-60"
          }`}
        >
          <div className="flex items-center gap-3">
            <Zap
              className={`w-4 h-4 ${trigger.enabled ? "text-yellow-400" : "text-gray-600"}`}
            />
            <div>
              <div className="text-sm font-medium text-gray-200">{trigger.name}</div>
              <div className="text-xs text-gray-500">
                Type: {trigger.type} • Triggered {trigger.triggerCount}x
                {trigger.lastTriggered && ` • Last: ${formatTimeAgo(trigger.lastTriggered)}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => onToggle(trigger.id, !trigger.enabled)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              trigger.enabled
                ? "bg-green-900/50 text-green-400 hover:bg-green-800/50"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {trigger.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="p-2 bg-gray-800/50 rounded">
      <div className="flex items-center gap-1 text-gray-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`font-medium ${color}`}>{value}</div>
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

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString();
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}
