/**
 * Script para probar directamente la API de Anthropic
 * Ejecutar con: npx tsx test-anthropic-direct.ts
 */

import Anthropic from "@anthropic-ai/sdk";

const MODELS_TO_TEST = [
  "claude-sonnet-4-5-20250929",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
];

async function testAnthropicAPI() {
  console.log("🔍 Probando modelos de Anthropic...\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY no configurada");
    process.exit(1);
  }

  console.log("✅ API Key encontrada:", apiKey.slice(0, 20) + "...\n");

  const anthropic = new Anthropic({ apiKey });

  for (const model of MODELS_TO_TEST) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🧪 Probando modelo: ${model}`);
    console.log("=".repeat(60));

    try {
      console.log("📤 Enviando mensaje...");

      const message = await anthropic.messages.create({
        model: model,
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "Di solo 'Hola'",
          },
        ],
      });

      console.log("✅ ¡Respuesta recibida!");
      console.log("📨 Respuesta:", message.content);
      console.log("📊 Tokens usados:", {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      });

      // Si llegamos aquí, este modelo funciona
      console.log(`\n✅ ✅ ✅ MODELO FUNCIONAL: ${model} ✅ ✅ ✅\n`);
      break; // Salir del loop si encontramos un modelo que funciona
    } catch (error: any) {
      console.error("❌ Error:");
      if (error.status) {
        console.error(`   Status: ${error.status}`);
      }
      if (error.message) {
        console.error(`   Mensaje: ${error.message}`);
      }
      if (error.error?.message) {
        console.error(`   Detalle: ${error.error.message}`);
      }
    }
  }
}

testAnthropicAPI();
