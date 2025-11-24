"use client";

import { useState, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatContainer from "./ChatContainer";
import { motion } from "framer-motion";

/**
 * Componente de demostración del chat
 * Muestra ejemplos de cómo se ven los mensajes del usuario y de Claude
 * con el typing indicator y animaciones
 */
export default function ChatDemo() {
  const [showTyping, setShowTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Demostración del efecto de streaming
  useEffect(() => {
    const fullMessage =
      "¡Hola! Este es un ejemplo de cómo se ve una respuesta de Claude en streaming. Los mensajes aparecen token por token, creando un efecto de escritura en tiempo real.";

    // Simular delay antes de empezar
    const typingTimeout = setTimeout(() => {
      setShowTyping(true);
    }, 1000);

    // Simular streaming de texto
    const streamTimeout = setTimeout(() => {
      setShowTyping(false);

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < fullMessage.length) {
          setStreamingMessage(fullMessage.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, 30); // 30ms por carácter

      return () => clearInterval(interval);
    }, 2500);

    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(streamTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-orange-50/30 via-amber-50/20 to-orange-50/30">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-claude-border bg-white/80 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Demo del Chat de Claude
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vista previa de los componentes y animaciones
          </p>
        </div>
      </motion.header>

      {/* Chat Container */}
      <ChatContainer>
        {/* Mensaje del usuario */}
        <MessageBubble
          content="Hola, ¿puedes mostrarme cómo funcionan los mensajes en este chat?"
          role="user"
        />

        {/* Typing indicator (aparece durante 2.5s) */}
        {showTyping && <TypingIndicator />}

        {/* Mensaje de Claude con streaming */}
        {streamingMessage && (
          <MessageBubble
            content={streamingMessage}
            role="assistant"
            isStreaming={!isComplete}
          />
        )}

        {/* Mensaje adicional del usuario */}
        {isComplete && (
          <>
            <MessageBubble
              content="¡Genial! Me encanta el efecto de streaming en tiempo real."
              role="user"
            />

            <MessageBubble
              content="Me alegra que te guste. Este es el diseño inspirado en Claude.ai con:
• Gradiente de fondo beige/naranja
• Burbujas alternadas (usuario a la derecha en azul, Claude a la izquierda en beige)
• Avatares circulares
• Animaciones suaves con framer-motion
• Auto-scroll automático
• Tipografía legible y espaciado cómodo"
              role="assistant"
            />
          </>
        )}
      </ChatContainer>

      {/* Footer con información */}
      <div className="border-t border-claude-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-sm text-gray-600">
            Esta es una demostración visual. Para usar el chat real, visita{" "}
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              /dev
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
