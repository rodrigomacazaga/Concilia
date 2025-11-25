"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Code, MessageSquare, FileText, Zap, CheckCircle } from "lucide-react";
import ApiKeyModal, { hasStoredApiKey } from "@/app/components/ApiKeyModal";

export default function HomePage() {
  const router = useRouter();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleOpenDevEnvironment = () => {
    // Si ya tiene una API key guardada, navegar directamente
    if (hasStoredApiKey()) {
      router.push("/dev");
    } else {
      // Si no, mostrar el modal
      setShowApiKeyModal(true);
    }
  };

  const handleApiKeySuccess = () => {
    setShowApiKeyModal(false);
    router.push("/dev");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 via-amber-50/20 to-orange-50/30">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Dev Companion</h1>
              <p className="text-xs text-gray-500">Powered by Claude</p>
            </div>
          </div>
          <button
            onClick={handleOpenDevEnvironment}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Open Dev Environment
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Your AI-Powered
            <br />
            <span className="text-orange-600">Development Assistant</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A conversational development environment that understands your project,
            remembers your decisions, and helps you code faster with Claude AI.
          </p>
          <button
            onClick={handleOpenDevEnvironment}
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            <Zap className="w-5 h-5" />
            Start Coding with AI
          </button>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Build Faster
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Conversational Development
            </h4>
            <p className="text-gray-600">
              Chat naturally with Claude to read files, write code, run commands,
              and get intelligent suggestions in real-time.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Persistent Memory Bank
            </h4>
            <p className="text-gray-600">
              Your project context, decisions, and progress are remembered across
              sessions. Claude always knows where you left off.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Direct File Operations
            </h4>
            <p className="text-gray-600">
              Claude can read, write, and modify files directly. No copy-paste needed.
              Just describe what you want, and it happens.
            </p>
          </motion.div>

          {/* Feature 4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Command Execution
            </h4>
            <p className="text-gray-600">
              Run npm, git, and other commands through conversation. Claude executes
              them safely and shows you the output.
            </p>
          </motion.div>

          {/* Feature 5 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Plan Before Acting
            </h4>
            <p className="text-gray-600">
              Use &ldquo;plan:&rdquo; to get detailed steps without execution, then &ldquo;actúa&rdquo; to
              run the plan. Review before you commit.
            </p>
          </motion.div>

          {/* Feature 6 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Progress Tracking
            </h4>
            <p className="text-gray-600">
              Automatic documentation of features, bugs, and decisions. Always know
              what&apos;s done, in progress, and what&apos;s next.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Get Started in 3 Steps
        </h3>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Clone and Install
              </h4>
              <p className="text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  git clone [repo] && npm install
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Add Your API Key
              </h4>
              <p className="text-gray-600">
                Create a <code className="bg-gray-100 px-2 py-1 rounded text-sm">.env</code> file
                with your Anthropic API key. Get one at{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Start Developing
              </h4>
              <p className="text-gray-600">
                Run <code className="bg-gray-100 px-2 py-1 rounded text-sm">npm run dev</code>,
                open <code className="bg-gray-100 px-2 py-1 rounded text-sm">/dev</code>,
                complete the onboarding, and start coding with Claude!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-12 text-white shadow-xl"
        >
          <h3 className="text-3xl font-bold mb-4">
            Ready to Code Smarter?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Experience the future of development with AI assistance
          </p>
          <button
            onClick={handleOpenDevEnvironment}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-lg shadow-lg"
          >
            <Zap className="w-5 h-5" />
            Open Dev Environment
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>
            Built with Next.js 15, TypeScript, and Claude AI
          </p>
          <p className="text-sm mt-2">
            Open source under MIT License
          </p>
        </div>
      </footer>

      {/* Modal para API Key */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={handleApiKeySuccess}
      />
    </div>
  );
}
