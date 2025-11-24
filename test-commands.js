/**
 * Script de prueba para el sistema de comandos
 * Prueba comandos permitidos y bloqueados
 */

const BASE_URL = "http://localhost:3000";

// Colores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

async function testCommand(command, shouldPass = true) {
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.blue}Probando:${colors.reset} ${colors.yellow}${command}${colors.reset}`
  );
  console.log(
    `${colors.blue}Esperado:${colors.reset} ${
      shouldPass ? colors.green + "✅ PERMITIDO" : colors.red + "❌ BLOQUEADO"
    }${colors.reset}`
  );

  try {
    const response = await fetch(`${BASE_URL}/api/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });

    if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
      // Es un stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let stdout = "";
      let stderr = "";
      let exitCode = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "stdout") {
                stdout += event.data;
              } else if (event.type === "stderr") {
                stderr += event.data;
              } else if (event.type === "complete") {
                exitCode = event.exitCode;
              }
            } catch (e) {
              // Ignorar líneas malformadas
            }
          }
        }
      }

      if (shouldPass) {
        console.log(`${colors.green}✅ Resultado: EJECUTADO${colors.reset}`);
        console.log(`${colors.blue}Exit code:${colors.reset} ${exitCode}`);
        if (stdout) {
          console.log(`${colors.blue}Stdout:${colors.reset} ${stdout.trim().substring(0, 100)}...`);
        }
        if (stderr) {
          console.log(`${colors.yellow}Stderr:${colors.reset} ${stderr.trim().substring(0, 100)}...`);
        }
        return { success: true, stdout, stderr, exitCode };
      } else {
        console.log(`${colors.red}❌ Error: Se ejecutó pero debería estar BLOQUEADO${colors.reset}`);
        return { success: false, error: "Should have been blocked" };
      }
    } else {
      // Es un error JSON
      const data = await response.json();

      if (!shouldPass) {
        console.log(`${colors.green}✅ Resultado: BLOQUEADO correctamente${colors.reset}`);
        console.log(`${colors.blue}Razón:${colors.reset} ${data.error}`);
        return { success: true, blocked: true, reason: data.error };
      } else {
        console.log(`${colors.red}❌ Error: Fue bloqueado pero debería EJECUTARSE${colors.reset}`);
        console.log(`${colors.yellow}Razón:${colors.reset} ${data.error}`);
        return { success: false, error: data.error };
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error de red: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(
    `${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║  PRUEBAS DEL SISTEMA DE COMANDOS      ║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`
  );

  const tests = [
    // COMANDOS PERMITIDOS
    { cmd: "npm --version", pass: true },
    { cmd: "git status", pass: true },
    { cmd: "ls -la", pass: true },
    { cmd: "pwd", pass: true },
    { cmd: "node --version", pass: true },

    // COMANDOS BLOQUEADOS
    { cmd: "rm -rf /", pass: false },
    { cmd: "sudo anything", pass: false },
    { cmd: "chmod 777 file", pass: false },
    { cmd: "cat package.json | grep name", pass: false },
    { cmd: "cat ../../../etc/passwd", pass: false },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testCommand(test.cmd, test.pass);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    // Pequeña pausa entre pruebas
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Resumen
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.cyan}RESUMEN DE PRUEBAS${colors.reset}`
  );
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.green}✅ Exitosas:${colors.reset} ${passed}/${tests.length}`
  );
  console.log(`${colors.red}❌ Fallidas:${colors.reset} ${failed}/${tests.length}`);
  console.log(
    `${colors.blue}Total:${colors.reset} ${tests.length} pruebas\n`
  );

  if (failed === 0) {
    console.log(
      `${colors.green}🎉 TODAS LAS PRUEBAS PASARON${colors.reset}\n`
    );
  } else {
    console.log(
      `${colors.red}⚠️  ALGUNAS PRUEBAS FALLARON${colors.reset}\n`
    );
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Ejecutar pruebas
runTests().catch((error) => {
  console.error(
    `${colors.red}Error fatal:${colors.reset}`,
    error
  );
  process.exit(1);
});
