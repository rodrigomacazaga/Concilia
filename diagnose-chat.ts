/**
 * Script de diagnóstico para probar el endpoint dev-chat
 * Ejecutar con: npx tsx diagnose-chat.ts
 */

console.log("🔍 Iniciando diagnóstico del chat...\n");

async function testChat() {
  const endpoint = "http://localhost:3000/api/dev-chat";

  console.log("📤 Enviando mensaje de prueba...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Di solo 'Hola'",
        conversationHistory: [],
      }),
    });

    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error del servidor:");
      console.error(error);
      return;
    }

    if (!response.body) {
      console.error("❌ No hay body en la respuesta");
      return;
    }

    console.log("\n✅ Conexión establecida, leyendo stream...\n");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("\n✅ Stream completado");
        console.log(`📊 Total de eventos recibidos: ${eventCount}`);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          eventCount++;
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`📨 Evento ${eventCount}:`, data);
          } catch (e) {
            console.log(`📨 Raw line: ${line}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Error durante la prueba:");
    console.error(error);
  }
}

// Ejecutar la prueba
testChat();
