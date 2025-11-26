/**
 * Tipos para Sistema de Temas TweakCN
 */

// Estructura de un tema TweakCN
export interface TweakCNTheme {
  name: string;
  type: string;
  cssVars: {
    light: ThemeVariables;
    dark: ThemeVariables;
  };
}

export interface ThemeVariables {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  // Opcionales
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
  sidebar?: string;
  'sidebar-foreground'?: string;
  'sidebar-primary'?: string;
  'sidebar-primary-foreground'?: string;
  'sidebar-accent'?: string;
  'sidebar-accent-foreground'?: string;
  'sidebar-border'?: string;
  'sidebar-ring'?: string;
  [key: string]: string | undefined;
}

export interface ParsedTheme {
  name: string;
  colors: {
    light: Record<string, { hsl: string; hex: string; tailwind: string }>;
    dark: Record<string, { hsl: string; hex: string; tailwind: string }>;
  };
  radius: string;
  cssVariables: string;
  tailwindConfig: string;
}

export interface ProjectCreationOptions {
  name: string;
  path: string;
  themeUrl?: string;
  technology?: 'nextjs' | 'react' | 'vue';
  includeDocker?: boolean;
}

// Temas populares preconfigurados
export const PRESET_THEMES: Record<string, string> = {
  'amber-minimal': 'https://tweakcn.com/r/themes/amber-minimal.json',
  'zinc-minimal': 'https://tweakcn.com/r/themes/zinc-minimal.json',
  'slate-minimal': 'https://tweakcn.com/r/themes/slate-minimal.json',
  'stone-minimal': 'https://tweakcn.com/r/themes/stone-minimal.json',
  'gray-minimal': 'https://tweakcn.com/r/themes/gray-minimal.json',
  'neutral-minimal': 'https://tweakcn.com/r/themes/neutral-minimal.json',
  'red-minimal': 'https://tweakcn.com/r/themes/red-minimal.json',
  'rose-minimal': 'https://tweakcn.com/r/themes/rose-minimal.json',
  'orange-minimal': 'https://tweakcn.com/r/themes/orange-minimal.json',
  'green-minimal': 'https://tweakcn.com/r/themes/green-minimal.json',
  'blue-minimal': 'https://tweakcn.com/r/themes/blue-minimal.json',
  'yellow-minimal': 'https://tweakcn.com/r/themes/yellow-minimal.json',
  'violet-minimal': 'https://tweakcn.com/r/themes/violet-minimal.json',
};

// Colores de preview para la UI (primary, secondary, accent)
export const PRESET_COLORS: Record<string, string[]> = {
  'amber-minimal': ['#f59e0b', '#fef3c7', '#292524'],
  'zinc-minimal': ['#71717a', '#f4f4f5', '#18181b'],
  'slate-minimal': ['#64748b', '#f1f5f9', '#0f172a'],
  'stone-minimal': ['#78716c', '#f5f5f4', '#1c1917'],
  'gray-minimal': ['#6b7280', '#f9fafb', '#111827'],
  'neutral-minimal': ['#737373', '#fafafa', '#171717'],
  'red-minimal': ['#ef4444', '#fef2f2', '#1c1917'],
  'rose-minimal': ['#f43f5e', '#fff1f2', '#1c1917'],
  'orange-minimal': ['#f97316', '#fff7ed', '#1c1917'],
  'green-minimal': ['#22c55e', '#f0fdf4', '#1c1917'],
  'blue-minimal': ['#3b82f6', '#eff6ff', '#1e293b'],
  'yellow-minimal': ['#eab308', '#fefce8', '#1c1917'],
  'violet-minimal': ['#8b5cf6', '#f5f3ff', '#1c1917'],
};
