# AI Dev Companion

<div align="center">

**Your AI-Powered Development Assistant**

An intelligent development environment with Claude AI integration, persistent Memory Bank, multi-project support, and real-time code assistance.

[Features](#-features) • [Quick Start](#-quick-start) • [Docker](#-docker-deployment) • [Usage](#-usage) • [MCP](#-mcp-support)

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## What is AI Dev Companion?

AI Dev Companion is a **conversational development environment** that lets you code by chatting with Claude AI. It understands your project context, remembers your decisions across sessions, and can directly read/write files and execute commands.

Think of it as having an AI pair programmer who:
- **Remembers everything** about your project (Memory Bank)
- **Writes code directly** to your files
- **Executes commands** (npm, git, etc.)
- **Plans before acting** to avoid mistakes
- **Tracks progress** automatically
- **Manages multiple projects** with individual contexts
- **Integrates with Git** for version control
- **Supports MCP servers** for extended functionality

---

## Features

### Conversational Development
Chat naturally with Claude to build features, fix bugs, or refactor code. No need to copy-paste—Claude can directly modify your files.

```
You: "Create a login component with email and password fields"
Claude: *Creates the component, adds validation, styles it with Tailwind*
```

### Bring Your Own Key (BYOK)
Use your own Anthropic API key. The key is stored locally in your browser and never sent to any server except Anthropic's API.

- Enter your API key once via the modal
- Select from the latest Claude models (Sonnet 4.5, 3.5 Sonnet, 3.5 Haiku)
- Change models anytime from the chat interface

### Multi-Project Support
Manage multiple projects, each with its own:
- Conversation history
- Memory Bank context
- Git repository
- Workspace directory

### Conversation Persistence
All conversations are automatically saved and can be resumed later. Never lose your chat history or context.

### Git Integration
Full Git operations within the app:
- View repository status
- Stage and commit changes
- Switch branches
- Pull and push (with configured credentials)

### Docker Support
Deploy easily with Docker Compose:
- Production-ready configuration
- Development mode with hot reload
- Persistent data volumes
- Git credentials mounting

### MCP (Model Context Protocol)
Connect external tool servers to extend Claude's capabilities:
- Add custom MCP servers
- Start/stop servers on demand
- Access additional tools and integrations

### Persistent Memory Bank
Your project context is stored in structured markdown files that Claude reads at the start of each session.

**Memory Bank includes:**
- Project brief and objectives
- Technical stack and dependencies
- Architecture patterns
- Decision history
- Feature progress
- Known issues

---

## Quick Start

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org))
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/rodrigomacazaga/Concilia.git
cd Concilia

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

### First Launch

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **"Open Dev Environment"**
3. Enter your Anthropic API key in the modal
4. Select your preferred Claude model
5. Start coding with Claude!

---

## Docker Deployment

### Quick Start with Docker

```bash
# Production mode
docker-compose up -d

# Development mode with hot reload
docker-compose --profile dev up -d ai-dev-companion-dev
```

### Docker Compose Configuration

```yaml
services:
  ai-dev-companion:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data              # Conversations and projects
      - ./workspaces:/app/workspaces  # Cloned repositories
      - ./mcp-servers:/app/mcp-servers
      - ~/.gitconfig:/root/.gitconfig:ro
      - ~/.ssh:/root/.ssh:ro
    environment:
      - NODE_ENV=production
```

### Environment Variables for Docker

```bash
# Optional: Set in docker-compose.yml or .env
DATA_DIR=/app/data
WORKSPACES_DIR=/app/workspaces
```

---

## Usage

### Basic Workflow

1. **Open /dev page**: Your main development environment
2. **Chat with Claude**: Describe what you want to build
3. **Review changes**: Claude shows you exactly what it's doing
4. **Verify output**: Check the preview panel or terminal

### Model Selection

Select your preferred Claude model from the dropdown below the chat input:
- **Claude Sonnet 4.5** - Most capable, recommended
- **Claude 3.5 Sonnet** - Fast and intelligent
- **Claude 3.5 Haiku** - Fastest responses

### Example Conversations

#### Creating a Component
```
You: "Create a Button component with variants (primary, secondary, danger)"
Claude: I'll create a reusable Button component...
*Creates app/components/ui/Button.tsx with TypeScript and Tailwind*
```

#### Git Operations
```
You: "Show me the git status and commit all changes"
Claude: *Runs git status, stages files, and creates a commit*
```

#### Plan Before Acting
```
You: "plan: add dark mode to the app"
Claude: *Provides detailed steps*

You: "actúa"
Claude: *Executes the plan step by step*
```

---

## MCP Support

### What is MCP?

Model Context Protocol (MCP) allows you to connect external tool servers that extend Claude's capabilities with custom tools and integrations.

### Adding an MCP Server

1. Go to `/settings/mcp` or use the API
2. Add server configuration:

```json
{
  "name": "My MCP Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": {
    "ALLOWED_PATHS": "/home/user/projects"
  }
}
```

### API Endpoints

```bash
# List MCP servers
GET /api/mcp

# Add MCP server
POST /api/mcp
{
  "name": "Server Name",
  "command": "npx",
  "args": ["..."],
  "env": {}
}

# Start/Stop server
POST /api/mcp/[id]
{ "action": "start" }  # or "stop"

# Delete server
DELETE /api/mcp/[id]
```

---

## API Reference

### Projects

```bash
# List projects
GET /api/projects

# Create project
POST /api/projects
{ "name": "My Project", "path": "/path/to/project" }

# Get/Update/Delete project
GET/PATCH/DELETE /api/projects/[id]
```

### Conversations

```bash
# List conversations for a project
GET /api/conversations?projectId=xxx

# Create conversation
POST /api/conversations
{ "projectId": "xxx", "title": "New Chat" }

# Get conversation with messages
GET /api/conversations/[id]

# Add message
POST /api/conversations/[id]
{ "role": "user", "content": "Hello" }
```

### Git Operations

```bash
# Get git status
GET /api/git/[projectId]

# Run git command
POST /api/git/[projectId]
{ "command": "status" }
```

---

## Project Structure

```
ai-dev-companion/
├── app/
│   ├── api/
│   │   ├── dev-chat/          # Claude chat endpoint
│   │   ├── conversations/     # Conversation persistence
│   │   ├── projects/          # Multi-project management
│   │   ├── git/               # Git operations
│   │   ├── mcp/               # MCP server management
│   │   ├── models/            # Available Claude models
│   │   ├── validate-api-key/  # API key validation
│   │   ├── files/             # File operations
│   │   ├── commands/          # Command execution
│   │   └── memory-bank/       # Memory Bank CRUD
│   ├── components/
│   │   ├── chat/              # Chat UI (ChatInput, etc.)
│   │   ├── ApiKeyModal.tsx    # API key entry modal
│   │   └── ...
│   ├── dev/                   # Main dev environment
│   └── page.tsx               # Landing page
├── lib/
│   ├── conversations.ts       # Conversation persistence logic
│   ├── projects.ts            # Project management logic
│   └── mcp.ts                 # MCP server management
├── data/                      # Persistent data (gitignored)
│   ├── conversations/         # Saved conversations
│   └── projects.json          # Project configurations
├── workspaces/                # Cloned project repositories
├── mcp-servers/               # MCP server configurations
├── memory-bank/               # Project context files
├── docker-compose.yml
├── Dockerfile
└── Dockerfile.dev
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root (optional - you can use BYOK instead):

```bash
# Optional: Server-side API key (if not using BYOK)
ANTHROPIC_API_KEY=your-api-key-here

# Optional: Default Claude model
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Optional: Allowed commands (comma-separated)
ALLOWED_COMMANDS=npm,git,cat,ls,pwd,echo,npx,node

# Optional: Base URL for API calls
NEXTAUTH_URL=http://localhost:3000
```

### Git Commands Allowlist

For security, only these git commands are allowed:
- `status`, `log`, `diff`, `show`
- `add`, `commit`, `push`, `pull`
- `branch`, `checkout`, `merge`
- `fetch`, `remote`, `stash`
- `reset` (soft only), `revert`

---

## Security

- **BYOK Model**: Your API key stays in your browser's localStorage
- **Command Execution**: Only whitelisted commands are allowed
- **File Access**: Limited to project directory
- **Git Safety**: Dangerous commands are blocked
- **No External Data**: All processing happens locally or through Anthropic's API

---

## Roadmap

- [x] Multi-project support
- [x] Conversation persistence
- [x] Git integration
- [x] Docker containerization
- [x] MCP server support
- [x] BYOK (Bring Your Own Key)
- [x] Model selection
- [ ] Project selector UI
- [ ] Conversation history sidebar
- [ ] MCP settings UI
- [ ] Support for other AI models
- [ ] Collaborative mode
- [ ] Dark mode
- [ ] Mobile-responsive design

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Vercel](https://vercel.com) for Next.js
- The open-source community

---

<div align="center">

**Star this repo if you find it useful!**

Made with AI

[Back to Top](#ai-dev-companion)

</div>
