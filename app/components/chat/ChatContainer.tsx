"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ChatContainerProps {
  children: ReactNode;
}

export default function ChatContainer({ children }: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [children]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#d1d5db transparent",
      }}
    >
      {/* Contenedor con max-width como Claude.ai */}
      <div className="max-w-4xl mx-auto">
        {children}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
