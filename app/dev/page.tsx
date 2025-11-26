"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "@/app/components/chat/MessageBubble";
import ChatInput from "@/app/components/chat/ChatInput";
import ChatContainer from "@/app/components/chat/ChatContainer";
import TypingIndicator from "@/app/components/chat/TypingIndicator";
import NotificationToast from "@/app/components/preview/NotificationToast";
import PreviewPanel from "@/app/components/preview/PreviewPanel";
import ProjectSelector from "@/app/components/ProjectSelector";
import { motion } from "framer-motion";
import { DevContextProvider, useDevContext } from "@/app/lib/DevContext";
import { GripVertical, Key, PanelLeftClose, PanelLeft } from "lucide-react";
import { hasAnyApiKey, getStoredModel } from "@/app/components/ApiKeyModal";
import { getStoredApiKey, getProviderFromModel } from "@/lib/ai-providers";

// Tipos
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function DevChatContent() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Paneles
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  // Proyecto, conversación y servicio seleccionados
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [currentService, setCurrentService] = useState<string | null>(null);

  const {
    addFileChange,
    addCommand,
    updateCommand,
    leftPanelSize,
    setLeftPanelSize,
    previewCollapsed,
  } = useDevContext();

  // Verificar API key al montar
  useEffect(() => {
    if (!hasAnyApiKey()) {
      setApiKeyMissing(true);
    }
  }, []);

  // State para tracking de comandos en progreso
  const [runningCommands, setRunningCommands] = useState<Record<string, string>>({});

  // Resize del chat/preview
  const [isResizingChat, setIsResizingChat] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Cargar conversación cuando se selecciona
  useEffect(() => {
    if (selectedConversation) {
      loadConversation(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();

      if (data.success && data.conversation?.messages) {
        setMessages(
          data.conversation.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            isStreaming: false,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  /**
   * Enviar mensaje a Claude usando SSE
   */
  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      // 1. Agregar mensaje del usuario
      const userMessageObj: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
      };

      setMessages((prev) => [...prev, userMessageObj]);
      setIsLoading(true);

      // 2. Preparar historial de conversación para la API
      const conversationHistory = messages
        .filter((msg) => msg.content.trim().length > 0)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // 3. Crear mensaje vacío para Claude
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessageId);

      try {
        const model = getStoredModel();
        const provider = getProviderFromModel(model);
        const apiKey = getStoredApiKey(provider);

        // Construir headers según el proveedor
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          switch (provider) {
            case "anthropic":
              headers["x-anthropic-key"] = apiKey;
              break;
            case "google":
              headers["x-google-key"] = apiKey;
              break;
            case "openai":
              headers["x-openai-key"] = apiKey;
              break;
          }
        }

        const response = await fetch("/api/dev-chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: conversationHistory,
            model: model,
            projectId: selectedProject,
            currentService: currentService,
          }),
        });

        if (!response.ok) {
          let errorMessage = `Error ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error("No hay body en la respuesta");
        }

        // Procesar el stream SSE
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                switch (event.type) {
                  case "token":
                    accumulatedContent += event.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                    break;

                  case "tool_use":
                    if (event.toolName === "execute_command") {
                      const cmdId = addCommand({
                        command: event.toolInput.command,
                        status: "running",
                        stdout: "",
                        stderr: "",
                      });
                      setRunningCommands((prev) => ({
                        ...prev,
                        [event.toolName]: cmdId,
                      }));
                      accumulatedContent += `\n\n🖥️ **Ejecutando:** \`${event.toolInput.command}\`\n`;
                    } else {
                      accumulatedContent += `\n\n_[Usando herramienta: ${event.toolName}]_\n`;
                    }
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                    break;

                  case "tool_result":
                    if (event.toolName === "write_file") {
                      try {
                        const result = JSON.parse(event.result);
                        if (result.success && result.path) {
                          addFileChange({
                            path: result.path,
                            timestamp: new Date(),
                            action: result.backupPath ? "modified" : "created",
                            backupPath: result.backupPath,
                          });
                        }
                      } catch {}
                      accumulatedContent += `_[Archivo escrito exitosamente]_\n\n`;
                    } else if (event.toolName === "execute_command") {
                      try {
                        const result = JSON.parse(event.result);
                        const cmdId = runningCommands[event.toolName];
                        if (cmdId) {
                          updateCommand(cmdId, {
                            status: result.success ? "success" : "error",
                            exitCode: result.exitCode,
                            stdout: result.stdout || "",
                            stderr: result.stderr || "",
                          });
                          setRunningCommands((prev) => {
                            const newCommands = { ...prev };
                            delete newCommands[event.toolName];
                            return newCommands;
                          });
                        }
                        accumulatedContent += result.success
                          ? `✅ **Comando completado**\n\n`
                          : `❌ **Comando falló**\n\n`;
                      } catch {
                        accumulatedContent += `_[Comando ejecutado]_\n\n`;
                      }
                    } else {
                      accumulatedContent += `_[${event.toolName} completado]_\n\n`;
                    }
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                    break;

                  case "complete":
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: event.content, isStreaming: false }
                          : msg
                      )
                    );
                    setStreamingMessageId(null);
                    break;

                  case "error":
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: `Error: ${event.message}`, isStreaming: false }
                          : msg
                      )
                    );
                    setStreamingMessageId(null);
                    break;
                }
              } catch {}
            }
          }
        }
      } catch (error) {
        let errorMessage = "Lo siento, ocurrió un error al procesar tu mensaje.";
        if (error instanceof Error) {
          errorMessage += `\n\nDetalles: ${error.message}`;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: errorMessage, isStreaming: false }
              : msg
          )
        );
        setStreamingMessageId(null);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addFileChange, selectedProject, currentService, runningCommands, addCommand, updateCommand]
  );

  // Manejadores de resize para chat/preview
  const handleChatResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingChat && chatContainerRef.current) {
        const containerRect = chatContainerRef.current.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const newLeftWidth = e.clientX - containerRect.left;
        const percentage = Math.min(Math.max((newLeftWidth / totalWidth) * 100, 30), 70);
        setLeftPanelSize(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizingChat(false);
    };

    if (isResizingChat) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingChat, setLeftPanelSize]);

  return (
    <div className="flex h-screen bg-gradient-to-b from-orange-50/30 via-amber-50/20 to-orange-50/30">
      {/* Panel Izquierdo - Proyectos */}
      {leftPanelOpen && (
        <div className="w-64 border-r bg-white flex-shrink-0 flex flex-col">
          <ProjectSelector
            onSelect={(id) => {
              setSelectedProject(id);
              setSelectedConversation(null);
              setCurrentService(null);
              setMessages([]);
            }}
            selected={selectedProject}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-gray-200 bg-white/80 backdrop-blur-sm"
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title={leftPanelOpen ? "Ocultar proyectos" : "Mostrar proyectos"}
                >
                  {leftPanelOpen ? (
                    <PanelLeftClose className="w-5 h-5 text-gray-500" />
                  ) : (
                    <PanelLeft className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {selectedProject ? "Chat de Desarrollo" : "Juliet"}
                  </h1>
                  {selectedProject && (
                    <p className="text-xs text-gray-500">
                      Proyecto seleccionado
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configurar API Keys"
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">API Keys</span>
              </button>
            </div>
          </div>
        </motion.header>

        {/* Warning si no hay API key */}
        {apiKeyMissing && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Key className="w-4 h-4" />
                <span className="text-sm">No hay API key configurada.</span>
              </div>
              <button
                onClick={() => router.push("/")}
                className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                Configurar
              </button>
            </div>
          </div>
        )}

        {/* Chat + Preview Container */}
        <div ref={chatContainerRef} className="flex-1 flex overflow-hidden">
          {/* Chat Section */}
          <div
            className={`flex flex-col overflow-hidden ${previewCollapsed || !selectedProject ? "flex-1" : ""}`}
            style={!previewCollapsed && selectedProject ? { width: `${leftPanelSize}%` } : undefined}
          >
            <ChatContainer>
              {!selectedProject ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-orange-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Selecciona un proyecto
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    Elige un proyecto del panel izquierdo o crea uno nuevo para comenzar a trabajar con Juliet.
                  </p>
                </motion.div>
              ) : messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-orange-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    ¡Hola! Soy Juliet
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    Estoy aquí para ayudarte con tu desarrollo. Puedo leer, escribir y
                    modificar archivos del proyecto. Pregúntame lo que necesites.
                  </p>
                </motion.div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      role={message.role}
                      isStreaming={message.isStreaming}
                    />
                  ))}
                  {isLoading && !streamingMessageId && <TypingIndicator />}
                </>
              )}
            </ChatContainer>

            {/* Input */}
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || !selectedProject} />
          </div>

          {/* Resize handle for Chat/Preview */}
          {!previewCollapsed && selectedProject && (
            <div
              onMouseDown={handleChatResizeMouseDown}
              className={`w-1 bg-gray-200 hover:bg-orange-400 cursor-col-resize flex items-center justify-center transition-colors ${
                isResizingChat ? "bg-orange-400" : ""
              }`}
            >
              <div className="p-0.5 bg-white rounded shadow-sm">
                <GripVertical className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          )}

          {/* Preview Panel */}
          {selectedProject && (
            <div
              className={`overflow-hidden ${previewCollapsed ? "flex-shrink-0" : ""}`}
              style={!previewCollapsed ? { width: `${100 - leftPanelSize}%` } : undefined}
            >
              <PreviewPanel
                projectId={selectedProject}
                selectedConversation={selectedConversation}
                onSelectConversation={setSelectedConversation}
                currentService={currentService}
                onServiceSelect={setCurrentService}
              />
            </div>
          )}
        </div>
      </div>

      {/* Notificaciones */}
      <NotificationToast />
    </div>
  );
}

export default function DevChatPage() {
  return (
    <DevContextProvider>
      <DevChatContent />
    </DevContextProvider>
  );
}
