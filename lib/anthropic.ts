import Anthropic from "@anthropic-ai/sdk";

// Inicializar el cliente de Anthropic
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Configuración por defecto para Claude
export const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
export const DEFAULT_MAX_TOKENS = 4096;
