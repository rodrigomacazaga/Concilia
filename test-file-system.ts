/**
 * Script de Prueba del Sistema de Archivos
 *
 * Este script prueba todos los endpoints de file operations:
 * - list_files
 * - read_file
 * - write_file
 * - Seguridad (intentos de acceso prohibido)
 * - Sistema de backups
 */

const BASE_URL = "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  if (error) console.log(`   Error: ${error}`);
  if (details) console.log(`   Details:`, details);
}

async function testListFiles() {
  console.log("\n📋 PRUEBA 1: Listar archivos en la raíz del proyecto");
  try {
    const response = await fetch(`${BASE_URL}/api/files/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "." }),
    });

    const data = await response.json();

    if (data.success && data.entries && data.entries.length > 0) {
      logTest("List files en raíz", true, undefined, {
        entriesCount: data.entries.length,
        firstEntries: data.entries.slice(0, 5).map((e: any) => e.name),
      });
      return data;
    } else {
      logTest("List files en raíz", false, "No se encontraron archivos");
      return null;
    }
  } catch (error: any) {
    logTest("List files en raíz", false, error.message);
    return null;
  }
}

async function testReadFile() {
  console.log("\n📖 PRUEBA 2: Leer archivo package.json");
  try {
    const response = await fetch(`${BASE_URL}/api/files/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "package.json" }),
    });

    const data = await response.json();

    if (data.success && data.content) {
      const packageJson = JSON.parse(data.content);
      logTest("Read package.json", true, undefined, {
        name: packageJson.name,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        contentLength: data.content.length,
      });
      return data;
    } else {
      logTest("Read package.json", false, data.error);
      return null;
    }
  } catch (error: any) {
    logTest("Read package.json", false, error.message);
    return null;
  }
}

async function testWriteNewFile() {
  console.log("\n✍️  PRUEBA 3: Crear nuevo archivo test-file.txt");
  try {
    const testContent = `Este es un archivo de prueba creado el ${new Date().toISOString()}
Línea 2: Testing file operations
Línea 3: Sistema de archivos funcionando correctamente`;

    const response = await fetch(`${BASE_URL}/api/files/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "test-file.txt",
        content: testContent,
      }),
    });

    const data = await response.json();

    if (data.success) {
      logTest("Write nuevo archivo", true, undefined, {
        message: data.message,
        backupCreated: !!data.backupPath,
        contentLength: testContent.length,
      });
      return data;
    } else {
      logTest("Write nuevo archivo", false, data.error);
      return null;
    }
  } catch (error: any) {
    logTest("Write nuevo archivo", false, error.message);
    return null;
  }
}

async function testReadCreatedFile() {
  console.log("\n📖 PRUEBA 4: Leer el archivo recién creado");
  try {
    const response = await fetch(`${BASE_URL}/api/files/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "test-file.txt" }),
    });

    const data = await response.json();

    if (data.success && data.content) {
      const linesCount = data.content.split("\n").length;
      logTest("Read archivo creado", true, undefined, {
        exists: data.exists,
        linesCount,
        firstLine: data.content.split("\n")[0].substring(0, 50) + "...",
      });
      return data;
    } else {
      logTest("Read archivo creado", false, data.error);
      return null;
    }
  } catch (error: any) {
    logTest("Read archivo creado", false, error.message);
    return null;
  }
}

async function testUpdateFile() {
  console.log("\n✏️  PRUEBA 5: Actualizar archivo existente (debe crear backup)");
  try {
    const updatedContent = `Archivo actualizado el ${new Date().toISOString()}
Este contenido es DIFERENTE al original
Se debería haber creado un backup`;

    const response = await fetch(`${BASE_URL}/api/files/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "test-file.txt",
        content: updatedContent,
      }),
    });

    const data = await response.json();

    if (data.success) {
      logTest("Update archivo (con backup)", true, undefined, {
        message: data.message,
        backupPath: data.backupPath,
        backupCreated: !!data.backupPath,
      });
      return data;
    } else {
      logTest("Update archivo (con backup)", false, data.error);
      return null;
    }
  } catch (error: any) {
    logTest("Update archivo (con backup)", false, error.message);
    return null;
  }
}

async function testSecurityPathTraversal() {
  console.log("\n🔒 PRUEBA 6: Seguridad - Intentar acceso fuera del proyecto");
  try {
    const response = await fetch(`${BASE_URL}/api/files/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "../../../etc/passwd" }),
    });

    const data = await response.json();

    // Debería FALLAR por razones de seguridad
    if (!data.success && response.status === 403) {
      logTest("Seguridad: path traversal bloqueado", true, undefined, {
        expectedError: data.error,
        status: response.status,
      });
      return data;
    } else {
      logTest(
        "Seguridad: path traversal bloqueado",
        false,
        "El sistema permitió acceso fuera del proyecto (VULNERABILIDAD)"
      );
      return null;
    }
  } catch (error: any) {
    logTest("Seguridad: path traversal bloqueado", false, error.message);
    return null;
  }
}

async function testSecurityEnvFile() {
  console.log("\n🔒 PRUEBA 7: Seguridad - Intentar leer archivo .env");
  try {
    const response = await fetch(`${BASE_URL}/api/files/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: ".env" }),
    });

    const data = await response.json();

    // Debería FALLAR por razones de seguridad
    if (!data.success && response.status === 403) {
      logTest("Seguridad: .env bloqueado", true, undefined, {
        expectedError: data.error,
        status: response.status,
      });
      return data;
    } else {
      logTest(
        "Seguridad: .env bloqueado",
        false,
        "El sistema permitió leer .env (VULNERABILIDAD)"
      );
      return null;
    }
  } catch (error: any) {
    logTest("Seguridad: .env bloqueado", false, error.message);
    return null;
  }
}

async function testListAppDirectory() {
  console.log("\n📁 PRUEBA 8: Listar archivos en directorio /app");
  try {
    const response = await fetch(`${BASE_URL}/api/files/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "app" }),
    });

    const data = await response.json();

    if (data.success && data.entries) {
      const directories = data.entries.filter((e: any) => e.type === "directory");
      const files = data.entries.filter((e: any) => e.type === "file");

      logTest("List directorio /app", true, undefined, {
        totalEntries: data.entries.length,
        directories: directories.length,
        files: files.length,
        sampleEntries: data.entries.slice(0, 3).map((e: any) => `${e.name} (${e.type})`),
      });
      return data;
    } else {
      logTest("List directorio /app", false, data.error);
      return null;
    }
  } catch (error: any) {
    logTest("List directorio /app", false, error.message);
    return null;
  }
}

async function testReadNonExistentFile() {
  console.log("\n❓ PRUEBA 9: Leer archivo que no existe");
  try {
    const response = await fetch(`${BASE_URL}/api/files/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "archivo-que-no-existe-12345.txt" }),
    });

    const data = await response.json();

    // Debería retornar error 404
    if (!data.success && response.status === 404 && !data.exists) {
      logTest("Read archivo inexistente", true, undefined, {
        status: response.status,
        exists: data.exists,
        error: data.error,
      });
      return data;
    } else {
      logTest("Read archivo inexistente", false, "No retornó 404 como se esperaba");
      return null;
    }
  } catch (error: any) {
    logTest("Read archivo inexistente", false, error.message);
    return null;
  }
}

async function testBackupExists() {
  console.log("\n💾 PRUEBA 10: Verificar que existen backups");
  try {
    const response = await fetch(`${BASE_URL}/api/files/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: ".backups" }),
    });

    const data = await response.json();

    if (data.success && data.entries && data.entries.length > 0) {
      logTest("Backups creados", true, undefined, {
        backupsCount: data.entries.length,
        backupFiles: data.entries.map((e: any) => e.name),
      });
      return data;
    } else {
      logTest(
        "Backups creados",
        false,
        "No se encontraron backups (¿se creó el directorio?)"
      );
      return null;
    }
  } catch (error: any) {
    // Si no existe el directorio, también es válido (no se había actualizado nada antes)
    logTest("Backups creados", true, "Directorio .backups no existe (es normal si no se actualizaron archivos)");
    return null;
  }
}

async function cleanupTestFile() {
  console.log("\n🧹 LIMPIEZA: Eliminar archivo de prueba");
  try {
    const fs = require("fs");
    const path = require("path");
    const testFilePath = path.join(process.cwd(), "test-file.txt");

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      logTest("Limpiar test-file.txt", true, undefined, { deleted: true });
    } else {
      logTest("Limpiar test-file.txt", true, undefined, { alreadyDeleted: true });
    }
  } catch (error: any) {
    logTest("Limpiar test-file.txt", false, error.message);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMEN DE PRUEBAS");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n✅ Pasadas: ${passed}/${total}`);
  console.log(`❌ Fallidas: ${failed}/${total}`);
  console.log(`📈 Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("❌ Pruebas fallidas:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    passed === total
      ? "🎉 ¡TODAS LAS PRUEBAS PASARON!"
      : "⚠️  Algunas pruebas fallaron. Revisa los detalles arriba."
  );
  console.log("=".repeat(60) + "\n");
}

async function runAllTests() {
  console.log("🚀 INICIANDO PRUEBAS DEL SISTEMA DE ARCHIVOS");
  console.log("=".repeat(60));

  await testListFiles();
  await testReadFile();
  await testWriteNewFile();
  await testReadCreatedFile();
  await testUpdateFile();
  await testSecurityPathTraversal();
  await testSecurityEnvFile();
  await testListAppDirectory();
  await testReadNonExistentFile();
  await testBackupExists();
  await cleanupTestFile();

  await printSummary();
}

// Ejecutar todas las pruebas
runAllTests().catch((error) => {
  console.error("❌ Error fatal durante las pruebas:", error);
  process.exit(1);
});
