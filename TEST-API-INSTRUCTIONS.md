# 🧪 Instrucciones para Probar el API Endpoint

## Prerequisitos

1. **Configura tu API Key de Anthropic**
   ```bash
   cp .env.example .env
   ```

   Edita `.env` y agrega tu API key:
   ```
   ANTHROPIC_API_KEY=tu_api_key_real_aqui
   ```

## Método 1: Usar el Script de Prueba (Recomendado)

### Paso 1: Inicia el servidor Next.js
En una terminal:
```bash
npm run dev
```

Espera a que el servidor esté listo. Deberías ver:
```
✓ Ready in 2.5s
○ Local:        http://localhost:3000
```

### Paso 2: Ejecuta el script de prueba
En **OTRA terminal** (sin cerrar la primera):
```bash
npm run test:api
```

Deberías ver:
- 🧪 Mensaje de inicio
- 📤 El request que se está enviando
- ✅ Confirmación de conexión
- El texto de Claude apareciendo en tiempo real
- 📊 Estadísticas al final
- ✅ Mensaje de prueba completada

## Método 2: Usar cURL

Con el servidor corriendo:

```bash
curl -X POST http://localhost:3000/api/dev-chat \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "message": "Hola, ¿qué es TypeScript?",
    "conversationHistory": []
  }'
```

Deberías ver eventos SSE en este formato:
```
data: {"type":"token","content":"Type"}
data: {"type":"token","content":"Script"}
data: {"type":"token","content":" es"}
...
data: {"type":"complete","content":"TypeScript es..."}
```

## Método 3: Usar JavaScript/Fetch desde el navegador

1. Abre http://localhost:3000 en tu navegador
2. Abre la consola del navegador (F12)
3. Pega y ejecuta este código:

```javascript
async function testAPI() {
  const response = await fetch('/api/dev-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hola, ¿qué es Next.js?',
      conversationHistory: []
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log(data);
      }
    }
  }
}

testAPI();
```

## Tipos de Eventos SSE que recibirás

### 1. Token (durante el streaming)
```json
{
  "type": "token",
  "content": "pedazo de texto"
}
```

### 2. Complete (al finalizar)
```json
{
  "type": "complete",
  "content": "respuesta completa de Claude"
}
```

### 3. Error (si algo falla)
```json
{
  "type": "error",
  "message": "descripción del error"
}
```

## Troubleshooting

### Error: "ANTHROPIC_API_KEY no está configurada"
- Asegúrate de haber creado el archivo `.env`
- Verifica que tiene tu API key real
- Reinicia el servidor Next.js (`npm run dev`)

### Error: "ECONNREFUSED"
- Asegúrate de que el servidor Next.js esté corriendo
- Verifica que esté en http://localhost:3000

### No ves respuestas en streaming
- Verifica que tu API key de Anthropic sea válida
- Revisa la consola del servidor Next.js para ver errores
- Asegúrate de tener créditos en tu cuenta de Anthropic

## Siguiente Paso

Una vez que confirmes que el API funciona correctamente, estarás listo para crear la interfaz de usuario (UI) para el chat.
