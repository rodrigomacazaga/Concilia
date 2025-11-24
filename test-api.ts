/**
 * Script de prueba para el endpoint /api/dev-chat
 *
 * Para ejecutar:
 * 1. Asegúrate de que el servidor Next.js esté corriendo: npm run dev
 * 2. En otra terminal, ejecuta: npx tsx test-api.ts
 *
 * (Necesitarás instalar tsx: npm install -D tsx)
 */

interface SSETokenEvent {
  type: "token";
  content: string;
}

interface SSECompleteEvent {
  type: "complete";
  content: string;
}

interface SSEErrorEvent {
  type: "error";
  message: string;
}

type SSEEvent = SSETokenEvent | SSECompleteEvent | SSEErrorEvent;

async function testDevChatAPI() {
  console.log("🧪 Iniciando prueba del endpoint /api/dev-chat...\n");

  const endpoint = "http://localhost:3000/api/dev-chat";

  const requestBody = {
    message: "Hola, ¿puedes explicarme qué es Next.js en una oración?",
    conversationHistory: [],
  };

  console.log("📤 Enviando request:");
  console.log(JSON.stringify(requestBody, null, 2));
  console.log("\n" + "=".repeat(80) + "\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Error del servidor:", error);
      return;
    }

    if (!response.body) {
      console.error("❌ No hay body en la respuesta");
      return;
    }

    console.log("✅ Conexión establecida, recibiendo eventos SSE...\n");

    // Procesar el stream SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("\n\n✅ Stream finalizado");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonData = line.slice(6); // Remover "data: "
            const event: SSEEvent = JSON.parse(jsonData);

            switch (event.type) {
              case "token":
                tokenCount++;
                process.stdout.write(event.content); // Mostrar en tiempo real
                fullResponse += event.content;
                break;

              case "complete":
                console.log("\n\n" + "=".repeat(80));
                console.log("🎉 Respuesta completa recibida");
                console.log("=".repeat(80));
                console.log(`\n📊 Estadísticas:`);
                console.log(`   - Tokens recibidos: ${tokenCount}`);
                console.log(`   - Longitud total: ${event.content.length} caracteres`);
                console.log(`\n📝 Respuesta completa:\n${event.content}`);
                break;

              case "error":
                console.error("\n\n❌ Error recibido:", event.message);
                break;

              default:
                console.log("\n⚠️ Evento desconocido:", event);
            }
          } catch (parseError) {
            console.error("⚠️ Error parseando JSON:", line);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Prueba completada exitosamente");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error durante la prueba:");
    console.error(error);
  }
}

// Ejecutar la prueba
testDevChatAPI();
