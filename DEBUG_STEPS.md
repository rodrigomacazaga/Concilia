# 🔍 Pasos de Depuración para el Chat

## He agregado logs extensivos al componente ChatInput

Ahora cada acción debería mostrar logs en la consola. Sigue estos pasos:

## Paso 1: Abrir el Chat en el Navegador

1. Asegúrate de que el servidor esté corriendo: `npm run dev`
2. Abre http://localhost:3000/dev en tu navegador
3. Abre las DevTools del navegador (F12 o clic derecho > Inspeccionar)
4. Ve a la pestaña **Console**
5. **Limpia la consola** (clic en el icono 🚫 o Ctrl+L)

## Paso 2: Verificar que el Componente se Monte

Cuando la página cargue, **inmediatamente** deberías ver estos logs:

```
🔧 ChatInput montado/actualizado
🔧 disabled: false
🔧 onSendMessage es función: true
```

### ¿Qué significa cada log?

- ✅ **Si ves estos logs**: El componente se montó correctamente
- ❌ **Si NO ves estos logs**: El componente no se está renderizando

## Paso 3: Escribir en el Input

Escribe la letra "H" en el campo de texto.

**Deberías ver:**
```
⌨️ Texto cambiado: H
```

Luego escribe "ola" (completa "Hola").

**Deberías ver:**
```
⌨️ Texto cambiado: Ho
⌨️ Texto cambiado: Hol
⌨️ Texto cambiado: Hola
```

### ¿Qué significa?

- ✅ **Si ves estos logs**: El input está respondiendo correctamente
- ❌ **Si NO ves estos logs**: El textarea no está capturando el evento onChange

## Paso 4: Presionar Enter

Después de escribir "Hola", presiona la tecla **Enter** (sin Shift).

**Deberías ver:**
```
⌨️ Tecla presionada: Enter - Shift: false
✅ Enter sin Shift detectado - llamando handleSend
🔹 handleSend llamado
🔹 Mensaje: Hola
🔹 Message trimmed: Hola
🔹 Disabled: false
✅ Condiciones OK, llamando onSendMessage
```

Luego, si todo funciona, deberías ver los logs de page.tsx:
```
📤 Enviando mensaje a /api/dev-chat...
📝 Mensaje: Hola
📚 Historial: 0 mensajes
📊 Response status: 200
📊 Response headers: {...}
✅ Iniciando procesamiento del stream...
```

### ¿Qué significa?

- ✅ **Si ves TODOS estos logs**: El flujo completo está funcionando
- ⚠️ **Si ves los logs hasta "handleSend" pero NO "Condiciones OK"**: El botón está deshabilitado o el mensaje está vacío
- ⚠️ **Si ves "Condiciones OK" pero NO ves "📤 Enviando mensaje"**: La función onSendMessage no está haciendo nada
- ❌ **Si NO ves ningún log de tecla**: El evento onKeyDown no se está disparando

## Paso 5: Alternativamente, Click en el Botón

En lugar de presionar Enter, escribe "Hola" y **haz clic en el botón de enviar** (el ícono del avión de papel).

**Deberías ver:**
```
🖱️ Botón de enviar clickeado
🖱️ Estado del botón - disabled: false
🔹 handleSend llamado
🔹 Mensaje: Hola
...etc
```

### ¿Qué significa?

- ✅ **Si ves "🖱️ Botón de enviar clickeado"**: El clic se está detectando
- ❌ **Si NO ves este log**: El botón no está respondiendo al clic

## 📊 Diagnóstico según lo que veas

### Escenario A: NO VEO NINGÚN LOG (ni siquiera "🔧 ChatInput montado")
**Problema:** El componente no se está renderizando o hay un error de JavaScript que impide la ejecución.

**Solución:**
1. Verifica la pestaña **Console** en DevTools por errores en ROJO
2. Recarga la página (Ctrl+R o Cmd+R)
3. Revisa la pestaña **Network** para ver si hay errores de carga

### Escenario B: Veo "🔧 ChatInput montado" pero NO veo "⌨️ Texto cambiado" al escribir
**Problema:** El textarea no está respondiendo a la entrada de texto.

**Posible causa:**
- El input está deshabilitado
- Hay un problema con React
- El foco no está en el textarea

**Solución:**
1. Verifica que el campo de texto no esté opaco (disabled)
2. Haz clic en el campo de texto para asegurarte de que tiene el foco
3. Intenta copiar y pegar texto en lugar de escribir

### Escenario C: Veo "⌨️ Texto cambiado" pero NO veo "⌨️ Tecla presionada" al presionar Enter
**Problema:** El evento onKeyDown no se está disparando.

**Solución:**
1. Asegúrate de estar presionando Enter dentro del textarea
2. Intenta usar el botón de enviar en su lugar

### Escenario D: Veo "🔹 handleSend llamado" pero veo "❌ Condiciones NO cumplidas"
**Problema:** El mensaje está vacío o el componente está deshabilitado.

**Mira el log adicional que muestra:**
```
❌ Condiciones NO cumplidas: {
  hasTrimmedMessage: false,  // <-- si es false, el mensaje está vacío
  isNotDisabled: false       // <-- si es false, el componente está deshabilitado
}
```

### Escenario E: Veo "✅ Condiciones OK, llamando onSendMessage" pero NADA MÁS
**Problema:** La función onSendMessage del padre no se está ejecutando o está fallando silenciosamente.

**Solución:**
1. Verifica errores en la consola
2. Esto es muy raro y puede indicar un problema serio con React

## 🎯 Por favor, comparte TODO lo que veas

Cuando pruebes, **copia y pega TODO el contenido de la consola** aquí, desde el primer log hasta el último. Esto me ayudará a identificar exactamente dónde está el problema.

## ✅ Estado Actual del Backend

El backend **SÍ FUNCIONA** - lo he verificado:
- ✅ El servidor está corriendo en http://localhost:3000
- ✅ El endpoint `/api/dev-chat` responde correctamente
- ✅ Claude está respondiendo a los mensajes
- ✅ El streaming SSE funciona perfectamente

**Por lo tanto, el problema está 100% en el frontend** (React/UI).
