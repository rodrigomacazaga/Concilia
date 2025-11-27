# Metodología de Corrección de Errores

## Visión General

Este documento describe la metodología de detección, seguimiento y corrección de errores implementada en Concilia. El sistema está diseñado para proporcionar observabilidad completa y facilitar la resolución rápida de problemas.

---

## 1. Arquitectura de Observabilidad

### 1.1 Capas del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    UI (React Components)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  ErrorBoundary  │  │ ObservabilityPanel│ │  Logs Panel  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
└───────────┼────────────────────┼─────────────────┬┼─────────┘
            │                    │                  │
┌───────────┼────────────────────┼──────────────────┼─────────┐
│           ▼                    ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              API Layer (/api/observability)         │    │
│  │  ┌──────────────┐  ┌──────────────┐                 │    │
│  │  │  /logs       │  │  /errors     │                 │    │
│  │  └──────────────┘  └──────────────┘                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
            │                    │
┌───────────┼────────────────────┼────────────────────────────┐
│           ▼                    ▼                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Core Observability (lib/observability)      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  │   Logger     │  │  ErrorStore  │  │ API Types │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Componentes Principales

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| Logger | `lib/observability/logger.ts` | Logging estructurado con niveles |
| API Types | `lib/observability/api-types.ts` | Tipos estandarizados de respuesta |
| ErrorBoundary | `app/components/ErrorBoundary.tsx` | Captura de errores de React |
| ObservabilityPanel | `app/components/ObservabilityPanel.tsx` | Dashboard de monitoreo |
| Logs API | `app/api/observability/logs/route.ts` | Endpoint de logs |
| Errors API | `app/api/observability/errors/route.ts` | Endpoint de errores |

---

## 2. Niveles de Severidad

### 2.1 Definición de Niveles

| Nivel | Color | Uso | Acción Requerida |
|-------|-------|-----|------------------|
| `debug` | Gris | Información de desarrollo | Ninguna |
| `info` | Azul | Eventos normales del sistema | Ninguna |
| `warn` | Amarillo | Situaciones inusuales pero recuperables | Monitorear |
| `error` | Rojo | Errores que afectan funcionalidad | Investigar |
| `fatal` | Rojo oscuro | Errores críticos del sistema | Acción inmediata |

### 2.2 Ejemplos de Uso

```typescript
import { logger } from '@/lib/observability/logger';

// Debug - para desarrollo
logger.debug('Processing request', { requestId: '123' });

// Info - eventos normales
logger.info('User logged in', { userId: 'user-1' });

// Warn - situaciones inusuales
logger.warn('API rate limit approaching', { remaining: 10 });

// Error - errores recuperables
logger.error('Failed to save file', error, { path: '/path/to/file' });

// Fatal - errores críticos
logger.fatal('Database connection lost', error);
```

---

## 3. Flujo de Detección y Corrección

### 3.1 Detección Automática

```
┌─────────────────┐
│  Error Occurs   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Is it a React Component Error?         │
└────────┬──────────────────────┬─────────┘
         │ YES                  │ NO
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  ErrorBoundary  │    │    try/catch    │
│  catches error  │    │    in code      │
└────────┬────────┘    └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│         Log Error via Logger            │
│   logger.error(message, error, data)    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    Report to /api/observability/errors  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     Display in ObservabilityPanel       │
└─────────────────────────────────────────┘
```

### 3.2 Proceso de Corrección

#### Paso 1: Identificación
1. Revisar el panel de Observabilidad
2. Filtrar por nivel de severidad
3. Identificar patrones en los errores

#### Paso 2: Análisis
1. Examinar el stack trace completo
2. Revisar datos de contexto asociados
3. Identificar el componente/API afectado
4. Buscar correlación con otros errores (traceId)

#### Paso 3: Reproducción
1. Usar la información del error para reproducir
2. Verificar en el ambiente de desarrollo
3. Documentar pasos de reproducción

#### Paso 4: Corrección
1. Implementar fix en código
2. Agregar logging adicional si es necesario
3. Agregar tests para prevenir regresión

#### Paso 5: Verificación
1. Ejecutar build: `npm run build`
2. Ejecutar tests: `npm test`
3. Verificar que el error no reaparece

#### Paso 6: Cierre
1. Marcar error como resuelto en el panel
2. Documentar solución si fue compleja
3. Actualizar documentación si es necesario

---

## 4. Patrones de Código Seguro

### 4.1 Manejo de Errores en APIs

```typescript
import { createSuccessResponse, createErrorResponse, ErrorCode } from '@/lib/observability/api-types';
import { logger } from '@/lib/observability/logger';

export async function POST(req: Request) {
  const traceId = `trace-${Date.now()}`;

  try {
    const body = await req.json();

    // Validación
    if (!body.required_field) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.BAD_REQUEST, 'Missing required field', undefined, traceId),
        { status: 400 }
      );
    }

    // Lógica de negocio
    const result = await processData(body);

    logger.info('Request processed successfully', { traceId });
    return NextResponse.json(createSuccessResponse(result));

  } catch (error) {
    logger.error('Request failed', error, { traceId });
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', undefined, traceId),
      { status: 500 }
    );
  }
}
```

### 4.2 Manejo de Errores en Componentes

```typescript
import { ErrorBoundary, useErrorHandler } from '@/app/components/ErrorBoundary';

// Opción 1: Wrapper con ErrorBoundary
function MyComponent() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}

// Opción 2: Hook para errores async
function MyAsyncComponent() {
  const handleError = useErrorHandler();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Fetch failed');
      return response.json();
    } catch (error) {
      handleError(error);
    }
  };
}
```

### 4.3 Operaciones de Archivo Seguras

```typescript
import fs from 'fs/promises';  // SIEMPRE usar promises, NUNCA sync

async function writeFileSafely(path: string, content: string) {
  try {
    // Asegurar que el directorio existe
    const dir = path.substring(0, path.lastIndexOf('/'));
    await fs.mkdir(dir, { recursive: true });

    // Escribir archivo
    await fs.writeFile(path, content, 'utf-8');

    logger.info('File written', { path });
  } catch (error) {
    logger.error('Failed to write file', error, { path });
    throw error;  // Re-throw para manejo superior
  }
}
```

---

## 5. Checklist de Revisión de Código

### 5.1 Seguridad

- [ ] No hay secrets hardcodeados
- [ ] No hay logging de datos sensibles
- [ ] Inputs del usuario están validados
- [ ] Errores no exponen información interna

### 5.2 Manejo de Errores

- [ ] Todos los async/await tienen try/catch
- [ ] Errores son logueados apropiadamente
- [ ] Se usa ErrorBoundary en componentes críticos
- [ ] Errores de red son manejados gracefully

### 5.3 Observabilidad

- [ ] Operaciones importantes tienen logs
- [ ] Los logs incluyen contexto útil
- [ ] Se usan los niveles de log correctos
- [ ] Las APIs usan respuestas estandarizadas

### 5.4 Performance

- [ ] No hay operaciones sync de filesystem
- [ ] Las operaciones async no bloquean UI
- [ ] Los recursos se liberan apropiadamente

---

## 6. Códigos de Error Estándar

| Código | HTTP Status | Descripción |
|--------|-------------|-------------|
| `BAD_REQUEST` | 400 | Solicitud malformada |
| `UNAUTHORIZED` | 401 | No autenticado |
| `FORBIDDEN` | 403 | Sin permisos |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Conflicto de estado |
| `VALIDATION_ERROR` | 422 | Error de validación |
| `RATE_LIMITED` | 429 | Límite excedido |
| `INTERNAL_ERROR` | 500 | Error interno |
| `SERVICE_UNAVAILABLE` | 503 | Servicio no disponible |

---

## 7. Métricas y KPIs

### 7.1 Métricas de Salud

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Errores/hora | < 10 | > 50 |
| Errores no resueltos | < 5 | > 20 |
| Tiempo medio de resolución | < 24h | > 72h |
| Uptime | > 99.5% | < 95% |

### 7.2 Dashboard de Observabilidad

El panel de observabilidad (tab "Obs" en PreviewPanel) muestra:

- **Logs**: Vista en tiempo real de logs del sistema
- **Errores**: Lista de errores con estado de resolución
- **Métricas**: (Próximamente) CPU, memoria, requests/s

---

## 8. Troubleshooting Común

### 8.1 "No hay logs disponibles"

**Causa**: El sistema no está generando logs o el filtro es muy restrictivo.

**Solución**:
1. Verificar que el servidor está corriendo
2. Cambiar filtro a "Todos los niveles"
3. Revisar la consola del servidor

### 8.2 "Error: Failed to fetch"

**Causa**: La API no está respondiendo.

**Solución**:
1. Verificar que el servidor Next.js está corriendo
2. Revisar logs del servidor para errores
3. Verificar conectividad de red

### 8.3 Errores de React sin stack trace

**Causa**: El error no fue capturado por ErrorBoundary.

**Solución**:
1. Agregar ErrorBoundary alrededor del componente
2. Usar useErrorHandler para errores async
3. Revisar consola del navegador

---

## 9. Contacto y Escalación

### Niveles de Escalación

1. **Nivel 1 - Desarrollador**
   - Errores `debug`, `info`, `warn`
   - Tiempo de respuesta: 24-48h

2. **Nivel 2 - Tech Lead**
   - Errores `error` persistentes
   - Tiempo de respuesta: 4-8h

3. **Nivel 3 - Emergencia**
   - Errores `fatal`
   - Sistema caído
   - Tiempo de respuesta: Inmediato

---

*Documento creado: 2025-11-26*
*Última actualización: 2025-11-26*
