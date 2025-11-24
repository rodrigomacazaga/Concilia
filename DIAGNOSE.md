# 🔍 Diagnóstico del Chat - Claude no responde

Si el chat no está respondiendo, sigue estos pasos para diagnosticar el problema:

## Paso 1: Verifica que el servidor esté corriendo

En una terminal:
```bash
npm run dev
```

Deberías ver:
```
✓ Ready in X.Xs
○ Local: http://localhost:3000
```

## Paso 2: Prueba directamente la API de Anthropic

En **OTRA terminal** (sin cerrar la primera):

```bash
npm run test:anthropic
```

**Esto probará los modelos de Claude en este orden:**
1. `claude-sonnet-4-5-20250929` (más reciente)
2. `claude-3-5-sonnet-20241022` (estable)
3. `claude-3-5-sonnet-20240620` (anterior)

**Qué buscar:**
- ✅ Si algún modelo responde "Hola", **ese modelo funciona**
- ❌ Si todos fallan, hay un problema con tu API key o cuenta

## Paso 3: Diagnóstica el endpoint del chat

```bash
npm run diagnose:chat
```

**Esto probará el endpoint `/api/dev-chat`** del servidor Next.js.

**Qué buscar:**
- ✅ `Status: 200` - El endpoint está funcionando
- ✅ Eventos SSE recibidos - El streaming funciona
- ❌ `Status: 400/500` - Hay un error en el endpoint
- ❌ No se reciben eventos - Problema con el streaming

## Soluciones comunes

### Problema 1: Modelo no disponible

**Síntoma:** Error 404 o "model not found"

**Solución:** El modelo `claude-sonnet-4-5-20250929` puede no estar disponible aún en tu cuenta.

Cambia el modelo en `app/api/dev-chat/route.ts` línea 34:

```typescript
// Cambiar de:
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// A:
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";
```

Reinicia el servidor después del cambio.

### Problema 2: API Key inválida

**Síntoma:** Error 401 "authentication error"

**Solución:**
1. Verifica tu API key en `.env`:
   ```bash
   cat .env
   ```

2. Asegúrate de que comience con `sk-ant-api03-`

3. Verifica en https://console.anthropic.com/settings/keys que:
   - La key existe
   - No ha expirado
   - Tienes créditos disponibles

### Problema 3: Sin créditos

**Síntoma:** Error sobre límites o créditos

**Solución:**
- Visita https://console.anthropic.com/settings/billing
- Verifica que tengas créditos disponibles
- Agrega créditos si es necesario

### Problema 4: El frontend no procesa eventos

**Síntoma:** El diagnóstico muestra eventos, pero el chat no muestra nada

**Solución:**
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña Console
3. Busca errores en rojo
4. Ve a la pestaña Network
5. Busca la petición a `/api/dev-chat`
6. Verifica que los eventos SSE estén llegando

## ¿Necesitas más ayuda?

Ejecuta todos los diagnósticos y comparte los resultados:

```bash
npm run test:anthropic
npm run diagnose:chat
```

Copia la salida completa de ambos comandos.
