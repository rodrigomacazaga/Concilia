"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start mb-6">
      {/* Avatar de Claude */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-claude-orange flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>

      {/* Burbuja de "typing" */}
      <div className="bg-claude-beige border border-claude-border rounded-2xl rounded-bl-md px-5 py-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              className="w-2 h-2 bg-gray-400 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
