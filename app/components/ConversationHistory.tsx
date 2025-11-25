"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  ChevronRight,
} from "lucide-react";

interface ConversationSummary {
  id: string;
  projectId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConversationHistoryProps {
  projectId: string;
  onSelect: (conversationId: string | null) => void;
  selected: string | null;
}

export function ConversationHistory({
  projectId,
  onSelect,
  selected,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [projectId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations?projectId=${projectId}`);
      const data = await response.json();

      if (data.success && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `Nueva conversación ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();

      if (data.success && data.conversation) {
        setConversations([data.conversation, ...conversations]);
        onSelect(data.conversation.id);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm("¿Eliminar esta conversación?")) return;

    try {
      await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      setConversations(conversations.filter((c) => c.id !== conversationId));
      if (selected === conversationId) {
        onSelect(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-white sticky top-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            Conversaciones
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={loadConversations}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refrescar"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleNewConversation}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Nueva conversación"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No hay conversaciones</p>
            <button
              onClick={handleNewConversation}
              className="mt-2 text-orange-500 hover:underline text-sm"
            >
              Iniciar conversación
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group rounded-lg transition-colors ${
                  selected === conversation.id
                    ? "bg-orange-100"
                    : "hover:bg-gray-100"
                }`}
              >
                <button
                  onClick={() => onSelect(conversation.id)}
                  className="w-full text-left p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium truncate flex-1 ${
                        selected === conversation.id
                          ? "text-orange-800"
                          : "text-gray-800"
                      }`}
                    >
                      {conversation.title}
                    </span>
                    {selected === conversation.id && (
                      <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conversation.messageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(conversation.updatedAt)}
                    </span>
                  </div>
                </button>

                {/* Delete button (visible on hover) */}
                <div className="hidden group-hover:flex items-center gap-1 px-2.5 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New conversation button at bottom */}
      <div className="p-2 border-t">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva conversación
        </button>
      </div>
    </div>
  );
}

export default ConversationHistory;
