"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  role: "user" | "assistant";
  isStreaming?: boolean;
}

export default function MessageBubble({
  content,
  role,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-6`}
    >
      {/* Avatar - solo para Claude (izquierda) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-claude-orange flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Mensaje */}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-claude-beige text-gray-900 border border-claude-border rounded-bl-md"
        }`}
      >
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-1.5 h-4 bg-current ml-0.5 align-middle"
            />
          )}
        </div>
      </div>

      {/* Avatar - solo para usuario (derecha) */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  );
}
