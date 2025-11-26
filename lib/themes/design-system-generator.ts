/**
 * Generador de Design System para Memory Bank
 */

import { ParsedTheme } from './types';

/**
 * Helper para describir uso de cada color
 */
function getColorUsage(colorName: string): string {
  const usages: Record<string, string> = {
    'background': 'Fondo principal de la app',
    'foreground': 'Texto principal',
    'card': 'Fondo de cards',
    'card-foreground': 'Texto en cards',
    'popover': 'Fondo de popovers/dropdowns',
    'popover-foreground': 'Texto en popovers',
    'primary': 'Acciones principales, CTAs',
    'primary-foreground': 'Texto sobre primary',
    'secondary': 'Acciones secundarias',
    'secondary-foreground': 'Texto sobre secondary',
    'muted': 'Fondos sutiles, disabled',
    'muted-foreground': 'Texto secundario, hints',
    'accent': 'Hover states, highlights',
    'accent-foreground': 'Texto sobre accent',
    'destructive': 'Errores, eliminar, danger',
    'destructive-foreground': 'Texto sobre destructive',
    'border': 'Bordes de contenedores',
    'input': 'Bordes de inputs',
    'ring': 'Focus ring',
  };

  return usages[colorName] || 'General';
}

/**
 * Genera el archivo 10-DESIGN-SYSTEM.md
 */
export function generateDesignSystemMD(theme: ParsedTheme, projectName: string): string {
  const colorRows = Object.entries(theme.colors.light)
    .map(([name, color]) =>
      `| ${name} | ${color.hsl} | ${color.hex} | \`${color.tailwind}\` | ${getColorUsage(name)} |`
    ).join('\n');

  return `# Design System - ${projectName}

> AUTO-GENERADO desde tema TweakCN: ${theme.name}
> No editar manualmente. Para cambiar colores, actualizar el tema y regenerar.

## Reglas Obligatorias

### 1. Framework de Estilos
- **USAR**: Tailwind CSS con variables CSS del tema
- **NO USAR**: Colores hardcodeados, inline styles
- **Tema base**: ${theme.name} (TweakCN/shadcn)

### 2. Colores del Sistema

#### Colores Semanticos (Light Mode)

| Variable | HSL | HEX | Tailwind Class | Uso |
|----------|-----|-----|----------------|-----|
${colorRows}

#### Como Usar los Colores

\`\`\`tsx
// CORRECTO: Usar clases semanticas
<button className="bg-primary text-primary-foreground">
  Accion Principal
</button>

<div className="bg-card text-card-foreground">
  Card content
</div>

<span className="text-muted-foreground">
  Texto secundario
</span>

// INCORRECTO: Colores hardcodeados
<button className="bg-orange-500">  // NO
<button style={{ background: '#f97316' }}>  // NO
\`\`\`

### 3. Border Radius

| Tamano | Variable | Uso |
|--------|----------|-----|
| lg | \`rounded-lg\` (${theme.radius}) | Cards, modales |
| md | \`rounded-md\` (calc(${theme.radius} - 2px)) | Botones, inputs |
| sm | \`rounded-sm\` (calc(${theme.radius} - 4px)) | Badges, chips |

### 4. Espaciado (Sistema de 4px)

| Tamano | Tailwind | Pixels | Uso |
|--------|----------|--------|-----|
| xs | \`p-1\`, \`gap-1\` | 4px | Iconos, separacion minima |
| sm | \`p-2\`, \`gap-2\` | 8px | Padding compacto |
| md | \`p-4\`, \`gap-4\` | 16px | Padding estandar |
| lg | \`p-6\`, \`gap-6\` | 24px | Secciones |
| xl | \`p-8\`, \`gap-8\` | 32px | Contenedores grandes |

### 5. Tipografia

| Elemento | Classes | Uso |
|----------|---------|-----|
| H1 | \`text-2xl font-bold text-foreground\` | Titulos de pagina |
| H2 | \`text-xl font-semibold text-foreground\` | Secciones |
| H3 | \`text-lg font-medium text-foreground\` | Subsecciones |
| Body | \`text-base text-foreground\` | Texto general |
| Muted | \`text-sm text-muted-foreground\` | Texto secundario |
| Small | \`text-xs text-muted-foreground\` | Labels, metadata |

### 6. Sombras

| Tipo | Class | Uso |
|------|-------|-----|
| Card | \`shadow-sm\` | Elevacion sutil |
| Dropdown | \`shadow-md\` | Menus, popovers |
| Modal | \`shadow-lg\` | Modales, dialogs |

### 7. Transiciones

\`\`\`tsx
// Transicion de colores (botones, links)
className="transition-colors duration-200"

// Transicion completa (cards hover)
className="transition-all duration-200"
\`\`\`

---

## Dark Mode

El sistema soporta dark mode automaticamente. Usa la clase \`.dark\` en el \`<html>\`.

\`\`\`tsx
// Los colores se adaptan automaticamente
<div className="bg-background text-foreground">
  Funciona en light y dark mode
</div>
\`\`\`

---

## Reglas de Implementacion

### HACER

\`\`\`tsx
// Usar colores semanticos del sistema
<button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-4 py-2">
  Guardar
</button>

// Usar variables de borde
<div className="border border-border rounded-lg">

// Usar colores de estado
<span className="text-destructive">Error</span>
<span className="text-muted-foreground">Hint</span>
\`\`\`

### NO HACER

\`\`\`tsx
// NO usar colores de Tailwind directamente
<button className="bg-orange-500">

// NO usar HEX inline
<div style={{ color: '#f97316' }}>

// NO usar colores arbitrarios
<div className="bg-[#f97316]">
\`\`\`

---

## Importaciones Requeridas

\`\`\`tsx
// Iconos (usar lucide-react)
import { Icon } from 'lucide-react';

// Componentes shadcn/ui (si estan instalados)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
\`\`\`
`;
}

/**
 * Genera el archivo 11-COMPONENT-LIBRARY.md
 */
export function generateComponentLibraryMD(theme: ParsedTheme, projectName: string): string {
  return `# Component Library - ${projectName}

> AUTO-GENERADO desde tema TweakCN: ${theme.name}
> Agregar nuevos componentes al final del archivo.

## Botones

### Primary Button
\`\`\`tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none">
  {children}
</button>
\`\`\`

### Secondary Button
\`\`\`tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-medium transition-colors">
  {children}
</button>
\`\`\`

### Outline Button
\`\`\`tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md font-medium transition-colors">
  {children}
</button>
\`\`\`

### Ghost Button
\`\`\`tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md font-medium transition-colors">
  {children}
</button>
\`\`\`

### Destructive Button
\`\`\`tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md font-medium transition-colors">
  {children}
</button>
\`\`\`

---

## Inputs

### Text Input
\`\`\`tsx
<input
  type="text"
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  placeholder="Placeholder..."
/>
\`\`\`

### Input with Label
\`\`\`tsx
<div className="space-y-2">
  <label className="text-sm font-medium leading-none">Label</label>
  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
  <p className="text-sm text-muted-foreground">Helper text</p>
</div>
\`\`\`

---

## Cards

### Basic Card
\`\`\`tsx
<div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
  <div className="p-6">{children}</div>
</div>
\`\`\`

### Card with Header
\`\`\`tsx
<div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
  <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
    <h3 className="text-lg font-semibold">Titulo</h3>
    <p className="text-sm text-muted-foreground">Descripcion</p>
  </div>
  <div className="p-6">{children}</div>
</div>
\`\`\`

---

## Badges

### Default Badge
\`\`\`tsx
<span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">
  Badge
</span>
\`\`\`

### Primary Badge
\`\`\`tsx
<span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
  Primary
</span>
\`\`\`

---

## Alerts

### Default Alert
\`\`\`tsx
<div className="relative w-full rounded-lg border border-border p-4">
  <h5 className="mb-1 font-medium">Titulo</h5>
  <div className="text-sm text-muted-foreground">Mensaje</div>
</div>
\`\`\`

### Destructive Alert
\`\`\`tsx
<div className="relative w-full rounded-lg border border-destructive/50 p-4 text-destructive bg-destructive/10">
  <h5 className="mb-1 font-medium">Error</h5>
  <div className="text-sm opacity-90">Mensaje de error</div>
</div>
\`\`\`

---

## Loading States

### Spinner
\`\`\`tsx
<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
\`\`\`

### Skeleton
\`\`\`tsx
<div className="animate-pulse rounded-md bg-muted h-4 w-full" />
\`\`\`

---

## Empty States

\`\`\`tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-3 mb-4">
    <Inbox className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium mb-1">No hay datos</h3>
  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
    Descripcion de por que esta vacio.
  </p>
  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
    Accion
  </button>
</div>
\`\`\`

---

## Componentes Adicionales

> Agregar nuevos componentes aqui siguiendo el mismo formato.
`;
}

/**
 * Genera el archivo 12-STYLE-TOKENS.md
 */
export function generateStyleTokensMD(theme: ParsedTheme, projectName: string): string {
  const lightColors = Object.entries(theme.colors.light)
    .map(([name, color]) => `| ${name.padEnd(25)} | ${color.hex} |`)
    .join('\n');

  const darkColors = Object.entries(theme.colors.dark)
    .map(([name, color]) => `| ${name.padEnd(25)} | ${color.hex} |`)
    .join('\n');

  return `# Style Tokens - ${projectName}

> Quick reference para copiar/pegar. Generado desde tema: ${theme.name}

## Colores Principales

### Fondos
\`\`\`
bg-background      -> Fondo principal
bg-card            -> Cards
bg-popover         -> Popovers, dropdowns
bg-muted           -> Fondos sutiles
bg-accent          -> Hover states
bg-primary         -> Accion principal
bg-secondary       -> Accion secundaria
bg-destructive     -> Errores, eliminar
\`\`\`

### Textos
\`\`\`
text-foreground         -> Texto principal
text-muted-foreground   -> Texto secundario
text-card-foreground    -> Texto en cards
text-primary-foreground -> Texto sobre primary
text-destructive        -> Texto de error
\`\`\`

### Bordes
\`\`\`
border-border      -> Borde estandar
border-input       -> Inputs
ring-ring          -> Focus ring
\`\`\`

## Espaciado Rapido

\`\`\`
p-1 gap-1    -> 4px  (xs)
p-2 gap-2    -> 8px  (sm)
p-3 gap-3    -> 12px
p-4 gap-4    -> 16px (md) <- DEFAULT
p-5 gap-5    -> 20px
p-6 gap-6    -> 24px (lg)
p-8 gap-8    -> 32px (xl)
\`\`\`

## Border Radius

\`\`\`
rounded-sm   -> ${theme.radius} - 4px
rounded-md   -> ${theme.radius} - 2px  <- Botones, inputs
rounded-lg   -> ${theme.radius}        <- Cards, modales
rounded-full -> 9999px                  <- Avatares, badges
\`\`\`

## Sombras

\`\`\`
shadow-sm    -> Cards
shadow-md    -> Dropdowns
shadow-lg    -> Modales
\`\`\`

## Tipografia

\`\`\`
text-xs   -> 12px  (metadata)
text-sm   -> 14px  (labels, hints)
text-base -> 16px  (body)
text-lg   -> 18px  (h3)
text-xl   -> 20px  (h2)
text-2xl  -> 24px  (h1)

font-normal    -> 400
font-medium    -> 500
font-semibold  -> 600
font-bold      -> 700
\`\`\`

## Transiciones

\`\`\`
transition-colors duration-200   -> Colores
transition-all duration-200      -> Todo
transition-transform duration-200 -> Transformaciones
\`\`\`

## Estados Comunes

\`\`\`
hover:bg-primary/90        -> Hover en primary
hover:bg-accent            -> Hover sutil
disabled:opacity-50        -> Deshabilitado
disabled:pointer-events-none
focus-visible:ring-2       -> Focus
focus-visible:ring-ring
focus-visible:ring-offset-2
\`\`\`

## Valores HEX (Light Mode)

${lightColors}

## Valores HEX (Dark Mode)

${darkColors}
`;
}

export { getColorUsage };
