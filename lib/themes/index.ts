/**
 * Sistema de Temas TweakCN
 *
 * Exporta todas las funciones y tipos para manejo de temas
 */

// Tipos
export type { TweakCNTheme, ThemeVariables, ParsedTheme } from './types';
export { PRESET_THEMES, PRESET_COLORS } from './types';

// Parser
export { fetchTheme, parseTheme, hslToHex, generateTailwindClass } from './theme-parser';

// Design System Generator
export {
  generateDesignSystemMD,
  generateComponentLibraryMD,
  generateStyleTokensMD,
  getColorUsage
} from './design-system-generator';
