# 🧠 AI Dev Companion

<div align="center">

**Your AI-Powered Development Assistant**

An intelligent development environment with Claude AI integration, persistent Memory Bank, and real-time code assistance.

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Memory Bank](#-memory-bank) • [Commands](#-natural-commands)

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## 🎯 What is AI Dev Companion?

AI Dev Companion is a **conversational development environment** that lets you code by chatting with Claude AI. It understands your project context, remembers your decisions across sessions, and can directly read/write files and execute commands.

Think of it as having an AI pair programmer who:
- ✅ **Remembers everything** about your project
- ✅ **Writes code directly** to your files
- ✅ **Executes commands** (npm, git, etc.)
- ✅ **Plans before acting** to avoid mistakes
- ✅ **Tracks progress** automatically

---

## ✨ Features

### 🗣️ Conversational Development
Chat naturally with Claude to build features, fix bugs, or refactor code. No need to copy-paste—Claude can directly modify your files.

**Example:**
```
You: "Create a login component with email and password fields"
Claude: *Creates the component, adds validation, styles it with Tailwind*
```

### 🧠 Persistent Memory Bank
Your project context is stored in structured markdown files that Claude reads at the start of each session. Never repeat yourself again.

**Memory Bank includes:**
- Project brief and objectives
- Technical stack and dependencies
- Architecture patterns
- Decision history
- Feature progress
- Known issues

### 📝 Direct File Operations
Claude can:
- Read any file in your project
- Write new files
- Modify existing code
- List directory contents

### ⚡ Command Execution
Run terminal commands through conversation:
- `npm install axios`
- `git status`
- `npm run build`

Claude executes them and shows you the output in real-time.

### 🎯 Plan Before Acting
Use the `plan:` prefix to get a detailed implementation plan without executing anything. Review it, then say `actúa` to execute.

```
You: "plan: add dark mode to the app"
Claude: *Provides detailed steps*

You: "actúa"
Claude: *Executes the plan step by step*
```

### 📊 Automatic Progress Tracking
Every feature, bug fix, and decision is automatically documented in the Memory Bank. Always know where your project stands.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org))
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-dev-companion.git
cd ai-dev-companion

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Add your Anthropic API key to .env
# ANTHROPIC_API_KEY=your-api-key-here

# 5. Start the development server
npm run dev
```

### First Launch

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **"Open Dev Environment"**
3. Complete the Memory Bank onboarding (takes 2 minutes)
4. Start coding with Claude! 🎉

---

## 📖 Usage

### Basic Workflow

1. **Open /dev page**: Your main development environment
2. **Chat with Claude**: Describe what you want to build
3. **Review changes**: Claude shows you exactly what it's doing
4. **Verify output**: Check the preview panel or terminal

### Example Conversations

#### Creating a Component
```
You: "Create a Button component with variants (primary, secondary, danger)"
Claude: I'll create a reusable Button component...
*Creates app/components/ui/Button.tsx with TypeScript and Tailwind*
```

#### Reading Files
```
You: "Show me the current structure of the dev page"
Claude: *Reads app/dev/page.tsx and explains the code*
```

#### Installing Dependencies
```
You: "Install Zustand for state management"
Claude: *Runs npm install zustand and updates Memory Bank*
```

#### Fixing Bugs
```
You: "The chat input is not clearing after sending messages"
Claude: *Reads the ChatInput component, finds the issue, and fixes it*
```

---

## 🧠 Memory Bank

The Memory Bank is the core feature that makes AI Dev Companion unique. It's a collection of 8 structured markdown files that Claude reads at the start of every conversation.

### Files Structure

```
memory-bank/
├── projectBrief.md      # Project name, problem, objectives
├── productContext.md    # UX flows, user personas, features
├── techContext.md       # Stack, dependencies, configuration
├── systemPatterns.md    # Architecture, code patterns, best practices
├── activeContext.md     # Current work session, pending decisions
├── progress.md          # Features (completed/in-progress/pending)
├── decisionLog.md       # Technical decisions with justification
└── knownIssues.md       # Bugs, technical debt, limitations
```

### Why It's Powerful

**Before Memory Bank:**
```
You: "What database are we using?"
Claude: "I don't have that information..."
```

**With Memory Bank:**
```
You: "What database are we using?"
Claude: "According to techContext.md, we're using PostgreSQL with Prisma ORM."
```

### Automatic Updates

Claude automatically updates the Memory Bank when:
- You complete a feature → `progress.md`
- You make a technical decision → `decisionLog.md`
- You find a bug → `knownIssues.md`
- You change dependencies → `techContext.md`

---

## 💬 Natural Commands

Claude understands natural language commands:

| Command | What It Does | Example |
|---------|-------------|---------|
| `"lee el contexto"` | Reads entire Memory Bank | "lee el contexto del proyecto" |
| `"recuerda que..."` | Updates relevant Memory Bank file | "recuerda que usamos PostgreSQL" |
| `"plan: [task]"` | Plans steps WITHOUT executing | "plan: add authentication" |
| `"actúa"` | Executes the previously proposed plan | "actúa" |
| `"actualiza memory bank"` | Updates Memory Bank with session changes | "actualiza el memory bank" |
| `"muéstrame progreso"` | Shows feature progress | "muéstrame el progreso del proyecto" |
| `"marca completado"` | Marks feature as done | "marca como completado el login" |

### Plan & Act Pattern

This is the safest way to build features:

```
You: "plan: crear un sistema de autenticación con JWT"

Claude: Here's the plan:
1. Install jsonwebtoken and bcrypt
2. Create /api/auth/login endpoint
3. Create useAuth hook
4. Add protected route middleware
5. Update Memory Bank

You: "actúa"

Claude: *Executes each step and confirms completion*
```

---

## 🏗️ Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **AI**: Anthropic Claude (Sonnet 4.5)
- **Styling**: Tailwind CSS 3
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## 📁 Project Structure

```
ai-dev-companion/
├── app/
│   ├── api/
│   │   ├── dev-chat/          # Claude chat endpoint
│   │   ├── files/             # File operations endpoints
│   │   ├── commands/          # Command execution endpoint
│   │   └── memory-bank/       # Memory Bank CRUD endpoints
│   ├── components/
│   │   ├── chat/              # Chat UI components
│   │   ├── memory-bank/       # Memory Bank UI
│   │   ├── onboarding/        # Onboarding wizard
│   │   └── preview/           # Preview panel
│   ├── lib/
│   │   ├── DevContext.tsx     # Global state management
│   │   └── file-operations-types.ts  # Tool definitions
│   ├── dev/                   # Main dev environment
│   ├── layout.tsx
│   └── page.tsx               # Landing page
├── memory-bank/               # Your project's persistent context
├── lib/                       # Shared utilities
├── public/                    # Static assets
└── ...config files
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root:

```bash
# Required: Anthropic API Key
ANTHROPIC_API_KEY=your-api-key-here

# Optional: Claude model to use (default: claude-sonnet-4-20250514)
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Optional: Allowed commands (comma-separated)
ALLOWED_COMMANDS=npm,git,cat,ls,pwd,echo,npx,node

# Optional: Base URL for API calls (default: http://localhost:3000)
NEXTAUTH_URL=http://localhost:3000
```

### Customization

You can customize:
- **Allowed commands**: Edit `ALLOWED_COMMANDS` in `.env`
- **Claude model**: Change `ANTHROPIC_MODEL` (check [Anthropic docs](https://docs.anthropic.com/claude/docs/models-overview))
- **Memory Bank structure**: Add/modify files in `memory-bank/`
- **UI colors**: Edit Tailwind config in `tailwind.config.ts`

---

## 🔒 Security

- **Command execution**: Only whitelisted commands are allowed
- **File access**: Limited to project directory
- **API key**: Stored securely in `.env` (never committed)
- **No external data**: All processing happens locally or through Anthropic's API

### Blocked Commands

For security, these commands are **NOT** allowed:
- `rm` (use file operations instead)
- `sudo` (no root access)
- `chmod`, `chown` (no permission changes)
- Shell pipes (`|`), redirects (`>`)

---

## 🚦 Common Issues

### "ANTHROPIC_API_KEY not configured"
**Solution**: Create a `.env` file with your API key:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Memory Bank not initializing
**Solution**: Delete `memory-bank/` and restart the app. The onboarding wizard will appear.

### Commands fail to execute
**Solution**: Check that commands are in `ALLOWED_COMMANDS` and available in your PATH.

### Build errors
**Solution**:
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] Support for other AI models (OpenAI, Google Gemini)
- [ ] Collaborative mode (multiple users)
- [ ] Plugin system for custom tools
- [ ] Memory Bank export/import
- [ ] Visual diff viewer for file changes
- [ ] Mobile-responsive design
- [ ] Dark mode
- [ ] Voice input/output

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Vercel](https://vercel.com) for Next.js
- The open-source community

---

## 💡 Tips for Success

1. **Initialize Memory Bank properly**: Take 2 minutes to complete the onboarding. Good context = better results.

2. **Use "plan:" often**: Always review the plan before letting Claude execute it.

3. **Update Memory Bank regularly**: Say "actualiza el memory bank" after major changes.

4. **Be specific**: Instead of "add a button", say "add a primary button with a loading state"

5. **Check the preview panel**: Always verify changes before committing them.

6. **Start small**: Begin with simple tasks to understand how Claude works, then tackle bigger features.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-dev-companion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-dev-companion/discussions)
- **Twitter**: [@yourusername](https://twitter.com/yourusername)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ and AI

[Back to Top](#-ai-dev-companion)

</div>
