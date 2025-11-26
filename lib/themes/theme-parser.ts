/**
 * Parser de Temas TweakCN
 * Descarga, parsea y genera configuracion de temas
 */

import { TweakCNTheme, ParsedTheme, PRESET_THEMES } from './types';

/**
 * Descarga un tema de TweakCN desde URL o preset
 */
export async function fetchTheme(urlOrPreset: string): Promise<TweakCNTheme> {
  // Verificar si es un preset
  const url = PRESET_THEMES[urlOrPreset] || urlOrPreset;

  // Extraer URL del comando npx si es necesario
  const themeUrl = extractUrlFromCommand(url);

  try {
    const response = await fetch(themeUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.status}`);
    }

    const theme: TweakCNTheme = await response.json();
    return theme;

  } catch (error: any) {
    throw new Error(`Error fetching theme from ${themeUrl}: ${error.message}`);
  }
}

/**
 * Extrae URL de un comando npx shadcn
 */
function extractUrlFromCommand(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }

  const urlMatch = input.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }

  if (!input.includes('/') && !input.includes(' ')) {
    return `https://tweakcn.com/r/themes/${input}.json`;
  }

  throw new Error(`Cannot extract theme URL from: ${input}`);
}

/**
 * Convierte HSL string a HEX
 */
export function hslToHex(hslString: string): string {
  try {
    const parts = hslString.trim().split(/\s+/);
    if (parts.length < 3) return '#000000';

    const h = parseFloat(parts[0]) || 0;
    const s = (parseFloat(parts[1]) || 0) / 100;
    const l = (parseFloat(parts[2]) || 0) / 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return '#000000';
  }
}

/**
 * Genera clase Tailwind para un color
 */
export function generateTailwindClass(colorName: string): string {
  const mapping: Record<string, string> = {
    'background': 'bg-background',
    'foreground': 'text-foreground',
    'card': 'bg-card',
    'card-foreground': 'text-card-foreground',
    'popover': 'bg-popover',
    'popover-foreground': 'text-popover-foreground',
    'primary': 'bg-primary',
    'primary-foreground': 'text-primary-foreground',
    'secondary': 'bg-secondary',
    'secondary-foreground': 'text-secondary-foreground',
    'muted': 'bg-muted',
    'muted-foreground': 'text-muted-foreground',
    'accent': 'bg-accent',
    'accent-foreground': 'text-accent-foreground',
    'destructive': 'bg-destructive',
    'destructive-foreground': 'text-destructive-foreground',
    'border': 'border-border',
    'input': 'border-input',
    'ring': 'ring-ring',
  };

  return mapping[colorName] || `bg-${colorName}`;
}

/**
 * Parsea un tema TweakCN
 */
export function parseTheme(theme: TweakCNTheme): ParsedTheme {
  const colors: ParsedTheme['colors'] = {
    light: {},
    dark: {}
  };

  // Parsear colores light
  for (const [key, value] of Object.entries(theme.cssVars.light)) {
    if (key === 'radius' || !value) continue;

    colors.light[key] = {
      hsl: value,
      hex: hslToHex(value),
      tailwind: generateTailwindClass(key)
    };
  }

  // Parsear colores dark
  for (const [key, value] of Object.entries(theme.cssVars.dark)) {
    if (key === 'radius' || !value) continue;

    colors.dark[key] = {
      hsl: value,
      hex: hslToHex(value),
      tailwind: generateTailwindClass(key)
    };
  }

  const cssVariables = generateCSSVariables(theme);
  const tailwindConfig = generateTailwindConfig();

  return {
    name: theme.name,
    colors,
    radius: theme.cssVars.light.radius || '0.5rem',
    cssVariables,
    tailwindConfig
  };
}

/**
 * Genera el contenido de globals.css
 */
function generateCSSVariables(theme: TweakCNTheme): string {
  let css = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
`;

  for (const [key, value] of Object.entries(theme.cssVars.light)) {
    if (value) {
      css += `    --${key}: ${value};\n`;
    }
  }

  css += `  }

  .dark {
`;

  for (const [key, value] of Object.entries(theme.cssVars.dark)) {
    if (value) {
      css += `    --${key}: ${value};\n`;
    }
  }

  css += `  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

  return css;
}

/**
 * Genera la configuracion de Tailwind
 */
function generateTailwindConfig(): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
`;
}
