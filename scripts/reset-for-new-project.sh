#!/bin/bash

# ============================================================================
# Reset AI Dev Companion for a New Project
# ============================================================================
# This script cleans the project and prepares it for a fresh start.
# Run this when forking the repo for a new project.

set -e  # Exit on error

echo "========================================="
echo "AI Dev Companion - Project Reset"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Confirm before proceeding
echo -e "${YELLOW}WARNING: This will delete:${NC}"
echo "  - memory-bank/ directory (all project context)"
echo "  - .next/ build cache"
echo "  - node_modules/ (you'll need to reinstall)"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🧹 Starting cleanup..."
echo ""

# 1. Remove Memory Bank
if [ -d "memory-bank" ]; then
    echo -e "${YELLOW}► Removing memory-bank/ directory...${NC}"
    rm -rf memory-bank/
    echo -e "${GREEN}✓ Memory Bank removed${NC}"
else
    echo "⚠️  memory-bank/ not found (already clean)"
fi

# 2. Recreate empty Memory Bank with templates
echo ""
echo -e "${YELLOW}► Recreating Memory Bank templates...${NC}"
mkdir -p memory-bank

# Create projectBrief.md
cat > memory-bank/projectBrief.md << 'EOF'
# Project Brief

## Nombre del Proyecto
[Pendiente de definir]

## Problema que Resuelve
[Pendiente de definir]

## Usuario Objetivo
[Pendiente de definir]

## Objetivos Principales
1. [Pendiente]
2. [Pendiente]
3. [Pendiente]

## Alcance

### Incluye:
- [Pendiente]
- [Pendiente]

### No Incluye:
- [Pendiente]
- [Pendiente]

## Métricas de Éxito
1. [Pendiente]
2. [Pendiente]
3. [Pendiente]

---
*Última actualización: [No inicializado]*
EOF

# Create other templates (abbreviated for space)
cat > memory-bank/productContext.md << 'EOF'
# Product Context

## User Experience (UX)

### Flujos Principales
1. [Pendiente]

### User Personas
- **Persona 1**: [Nombre]

## Lógica de Negocio

### Reglas de Negocio
1. [Pendiente]

## Features

### Completadas
- [ ] [Feature pendiente]

---
*Última actualización: [No inicializado]*
EOF

cat > memory-bank/techContext.md << 'EOF'
# Technical Context

## Stack Tecnológico

### Frontend
- Framework: [Pendiente]
- UI Library: [Pendiente]

### Backend
- Runtime: [Pendiente]
- Framework: [Pendiente]

---
*Última actualización: [No inicializado]*
EOF

# Create remaining templates (abbreviated)
touch memory-bank/systemPatterns.md
touch memory-bank/activeContext.md
touch memory-bank/progress.md
touch memory-bank/decisionLog.md
touch memory-bank/knownIssues.md

echo -e "${GREEN}✓ Memory Bank templates created (8 files)${NC}"

# 3. Remove build artifacts
echo ""
echo -e "${YELLOW}► Removing build artifacts...${NC}"
if [ -d ".next" ]; then
    rm -rf .next/
    echo -e "${GREEN}✓ .next/ removed${NC}"
fi

# 4. Remove node_modules
echo ""
echo -e "${YELLOW}► Removing node_modules...${NC}"
if [ -d "node_modules" ]; then
    rm -rf node_modules/
    echo -e "${GREEN}✓ node_modules/ removed${NC}"
fi

# 5. Remove validation reports (optional)
echo ""
echo -e "${YELLOW}► Cleaning up old reports...${NC}"
rm -f MEMORY_BANK_VALIDATION_REPORT.md COMMAND_SYSTEM_VALIDATION.md VALIDATION_REPORT.md
echo -e "${GREEN}✓ Old reports removed${NC}"

# 6. Update package.json (prompt for project name)
echo ""
echo -e "${YELLOW}► Package configuration${NC}"
read -p "Enter your project name (or press Enter to skip): " PROJECT_NAME
if [ ! -z "$PROJECT_NAME" ]; then
    # This would require jq or sed to update package.json properly
    echo "⚠️  Remember to manually update package.json with:"
    echo "   - name: $PROJECT_NAME"
    echo "   - author: your name"
    echo "   - repository: your repo URL"
fi

# 7. Final instructions
echo ""
echo "========================================="
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo "========================================="
echo ""
echo "📋 Next steps:"
echo "  1. npm install                    # Reinstall dependencies"
echo "  2. cp .env.example .env           # Create .env file"
echo "  3. # Add your ANTHROPIC_API_KEY to .env"
echo "  4. npm run dev                    # Start development server"
echo "  5. Open http://localhost:3000/dev # Complete onboarding"
echo ""
echo "🎉 Your project is ready for a fresh start!"
echo ""
