"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "@/app/components/chat/MessageBubble";
import ChatInput from "@/app/components/chat/ChatInput";
import ChatContainer from "@/app/components/chat/ChatContainer";
import TypingIndicator from "@/app/components/chat/TypingIndicator";
import PreviewPanel from "@/app/components/preview/PreviewPanel";
import NotificationToast from "@/app/components/preview/NotificationToast";
import MemoryBankBadge from "@/app/components/memory-bank/MemoryBankBadge";
import MemoryBankOnboarding from "@/app/components/onboarding/MemoryBankOnboarding";
import MemoryBankPanel from "@/app/components/memory-bank/MemoryBankPanel";
import { motion, AnimatePresence } from "framer-motion";
import { DevContextProvider, useDevContext } from "@/app/lib/DevContext";
import { GripVertical, Key } from "lucide-react";
import { getStoredApiKey, hasStoredApiKey, clearStoredApiKey, getStoredModel } from "@/app/components/ApiKeyModal";

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

  const {
    leftPanelSize,
    setLeftPanelSize,
    previewCollapsed,
    addFileChange,
    addCommand,
    updateCommand,
    memoryBankStatus,
    refreshMemoryBankStatus,
  } = useDevContext();

  // Verificar API key al montar
  useEffect(() => {
    if (!hasStoredApiKey()) {
      setApiKeyMissing(true);
    }
  }, []);

  // State para tracking de comandos en progreso
  const [runningCommands, setRunningCommands] = useState<Record<string, string>>({});

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // State para modales de Memory Bank
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMemoryBankPanel, setShowMemoryBankPanel] = useState(false);

  // Cargar estado del Memory Bank al montar
  useEffect(() => {
    refreshMemoryBankStatus();
  }, [refreshMemoryBankStatus]);

  // Auto-abrir onboarding si no está inicializado
  useEffect(() => {
    if (memoryBankStatus && !memoryBankStatus.initialized && !memoryBankStatus.exists) {
      // Esperar 2 segundos antes de mostrar el onboarding
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [memoryBankStatus]);

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
        // 4. Hacer el request al endpoint SSE
        console.log("📤 Enviando mensaje a /api/dev-chat...");
        console.log("📝 Mensaje:", userMessage);
        console.log("📚 Historial:", conversationHistory.length, "mensajes");

        const apiKey = getStoredApiKey();
        const model = getStoredModel();
        const response = await fetch("/api/dev-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey && { "x-api-key": apiKey }),
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: conversationHistory,
            model: model,
          }),
        });

        console.log("📊 Response status:", response.status);

        if (!response.ok) {
          let errorMessage = `Error ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
            console.error("❌ Error del servidor:", errorData);
          } catch {
            const errorText = await response.text();
            console.error("❌ Error del servidor (texto):", errorText);
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error("No hay body en la respuesta");
        }

        console.log("✅ Iniciando procesamiento del stream...");

        // 5. Procesar el stream SSE
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let tokenCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("✅ Stream finalizado");
              console.log(`📊 Total de tokens recibidos: ${tokenCount}`);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonData = line.slice(6);
                  const event = JSON.parse(jsonData);

                  switch (event.type) {
                    case "token":
                      tokenCount++;
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
                      console.log("🔧 Claude está usando herramienta:", event.toolName, event.toolInput);

                      // Si es execute_command, agregar al historial inmediatamente con status "running"
                      if (event.toolName === "execute_command") {
                        const cmdId = addCommand({
                          command: event.toolInput.command,
                          status: "running",
                          stdout: "",
                          stderr: "",
                        });
                        // Guardar el ID para actualizarlo después
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
                      console.log("✅ Resultado de herramienta:", event.toolName);

                      // Si la herramienta fue write_file, agregar al contexto
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
                        } catch (e) {
                          console.error("Error parsing tool result:", e);
                        }
                        accumulatedContent += `_[Herramienta ${event.toolName} ejecutada exitosamente]_\n\n`;
                      }
                      // Si la herramienta fue execute_command, actualizar el historial
                      else if (event.toolName === "execute_command") {
                        try {
                          const result = JSON.parse(event.result);
                          const cmdId = runningCommands[event.toolName];

                          if (cmdId) {
                            updateCommand(cmdId, {
                              status: result.success ? "success" : "error",
                              exitCode: result.exitCode,
                              stdout: result.stdout || "",
                              stderr: result.stderr || "",
                              error: result.error,
                            });

                            // Limpiar del tracking
                            setRunningCommands((prev) => {
                              const newCommands = { ...prev };
                              delete newCommands[event.toolName];
                              return newCommands;
                            });
                          }

                          if (result.success) {
                            accumulatedContent += `✅ **Comando completado** (exit ${result.exitCode})\n\n`;
                          } else {
                            accumulatedContent += `❌ **Comando falló** (exit ${result.exitCode})\n\n`;
                          }
                        } catch (e) {
                          console.error("Error parsing command result:", e);
                          accumulatedContent += `_[Herramienta ${event.toolName} ejecutada]_\n\n`;
                        }
                      } else {
                        accumulatedContent += `_[Herramienta ${event.toolName} ejecutada exitosamente]_\n\n`;
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
                      console.log("✅ Mensaje completado");
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
                      console.error("❌ Error del servidor (evento SSE):", event.message);
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? {
                                ...msg,
                                content: `Error: ${event.message}`,
                                isStreaming: false,
                              }
                            : msg
                        )
                      );
                      setStreamingMessageId(null);
                      break;
                  }
                } catch (parseError) {
                  console.error("⚠️ Error parseando JSON:", parseError);
                  console.error("⚠️ Línea problemática:", line);
                }
              }
            }
          }
        } catch (streamError) {
          console.error("❌ Error durante el streaming:", streamError);
          throw streamError;
        }
      } catch (error) {
        console.error("❌ Error al enviar mensaje:", error);

        let errorMessage = "Lo siento, ocurrió un error al procesar tu mensaje.";
        if (error instanceof Error) {
          errorMessage += `\n\nDetalles: ${error.message}`;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: errorMessage,
                  isStreaming: false,
                }
              : msg
          )
        );
        setStreamingMessageId(null);
      } finally {
        setIsLoading(false);
        console.log("🏁 Solicitud finalizada (isLoading = false)");
      }
    },
    [messages, addFileChange]
  );

  // Manejadores de drag para redimensionar paneles
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newSize = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limitar entre 30% y 70%
      const clampedSize = Math.min(Math.max(newSize, 30), 70);
      setLeftPanelSize(clampedSize);
    },
    [isDragging, setLeftPanelSize]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Event listeners para drag
  useState(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove as any);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  });

  return (
    <div ref={containerRef} className="flex h-screen bg-gradient-to-b from-orange-50/30 via-amber-50/20 to-orange-50/30">
      {/* Panel Izquierdo - Chat */}
      <div
        className="flex flex-col"
        style={{
          width: previewCollapsed ? "100%" : `${leftPanelSize}%`,
          transition: isDragging ? "none" : "width 0.2s ease",
        }}
      >
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-claude-border bg-white/80 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Chat de Desarrollo con Claude
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Desarrollo colaborativo potenciado por IA
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    clearStoredApiKey();
                    router.push("/");
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cambiar API Key"
                >
                  <Key className="w-4 h-4" />
                  <span className="hidden sm:inline">API Key</span>
                </button>
                <MemoryBankBadge
                  onOpenPanel={() => setShowMemoryBankPanel(true)}
                  onOpenOnboarding={() => setShowOnboarding(true)}
                />
              </div>
            </div>
          </div>
        </motion.header>

        {/* Warning si no hay API key */}
        {apiKeyMissing && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Key className="w-5 h-5" />
                <span className="text-sm font-medium">
                  No hay API key configurada. El chat no funcionará correctamente.
                </span>
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

        {/* Chat Container */}
        <ChatContainer>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-claude-orange/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-claude-orange"
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
                ¡Hola! Soy Claude
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
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Divisor Draggable */}
      {!previewCollapsed && (
        <div
          className={`w-1 bg-claude-border hover:bg-claude-orange hover:w-1.5 transition-all cursor-col-resize flex items-center justify-center ${
            isDragging ? "bg-claude-orange w-1.5" : ""
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="p-1 bg-white rounded shadow-sm">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      )}

      {/* Panel Derecho - Preview */}
      {!previewCollapsed && (
        <div
          className="flex flex-col"
          style={{
            width: `${100 - leftPanelSize}%`,
            transition: isDragging ? "none" : "width 0.2s ease",
          }}
        >
          <PreviewPanel />
        </div>
      )}

      {/* Notificaciones */}
      <NotificationToast />

      {/* Memory Bank Modales */}
      <AnimatePresence>
        {showOnboarding && (
          <MemoryBankOnboarding
            onComplete={() => {
              setShowOnboarding(false);
              refreshMemoryBankStatus();
            }}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMemoryBankPanel && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-6xl h-[90vh]"
            >
              <MemoryBankPanel onClose={() => setShowMemoryBankPanel(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
