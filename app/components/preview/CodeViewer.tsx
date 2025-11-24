"use client";

import { useEffect, useState } from "react";
import { FileCode, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface CodeViewerProps {
  filePath: string;
  content: string;
  lastModified?: Date;
  isModified?: boolean;
}

export default function CodeViewer({
  filePath,
  content,
  lastModified,
  isModified = false,
}: CodeViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const extension = filePath.split(".").pop()?.toLowerCase() || "";

  useEffect(() => {
    setLines(content.split("\n"));
  }, [content]);

  // Determinar el lenguaje por extensión
  const getLanguageLabel = () => {
    const langMap: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript React",
      js: "JavaScript",
      jsx: "JavaScript React",
      json: "JSON",
      css: "CSS",
      md: "Markdown",
      txt: "Text",
      html: "HTML",
    };
    return langMap[extension] || extension.toUpperCase();
  };

  // Syntax highlighting muy básico
  const highlightLine = (line: string, lineNum: number) => {
    let highlighted = line;

    // Escapar HTML
    highlighted = highlighted
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Keywords (TypeScript/JavaScript)
    const keywords = [
      "import",
      "export",
      "const",
      "let",
      "var",
      "function",
      "async",
      "await",
      "return",
      "if",
      "else",
      "for",
      "while",
      "class",
      "interface",
      "type",
      "enum",
      "extends",
      "implements",
    ];

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        '<span class="text-purple-600 font-semibold">$1</span>'
      );
    });

    // Strings
    highlighted = highlighted.replace(
      /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g,
      '<span class="text-green-600">$1</span>'
    );

    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      '<span class="text-gray-500 italic">$1</span>'
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+(\.\d+)?)\b/g,
      '<span class="text-blue-600">$1</span>'
    );

    return highlighted;
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-claude-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border bg-claude-beige/30">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-claude-orange" />
          <span className="text-sm font-medium text-gray-900">{filePath}</span>
          {isModified && (
            <span className="px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded">
              Modificado
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileCode className="w-3 h-3" />
            {getLanguageLabel()}
          </span>
          {lastModified && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastModified.toLocaleTimeString()}
            </span>
          )}
          <span className="text-gray-400">{lines.length} líneas</span>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="flex">
          {/* Line numbers */}
          <div className="flex-shrink-0 px-3 py-4 bg-gray-100 border-r border-gray-200 select-none">
            {lines.map((_, idx) => (
              <div
                key={idx}
                className="text-xs text-gray-400 text-right leading-6 font-mono"
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Code content */}
          <div className="flex-1 px-4 py-4 overflow-x-auto">
            <pre className="font-mono text-sm leading-6">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="hover:bg-blue-50/50 transition-colors"
                  dangerouslySetInnerHTML={{
                    __html: highlightLine(line, idx) || "&nbsp;",
                  }}
                />
              ))}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-claude-border bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          <span>Vista de solo lectura - {content.length} caracteres</span>
        </div>
      </div>
    </div>
  );
}
