// ============================================================================
// Test Runner - Execute and report test results
// ============================================================================

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { logger } from "@/lib/observability/logger";
import type { TestResult, TestError, TestFramework, BuildResult, LintResult } from "./types";

const execAsync = promisify(exec);

// ============================================================================
// Framework Detection
// ============================================================================

export async function detectTestFramework(
  projectPath: string
): Promise<TestFramework> {
  const packageJsonPath = path.join(projectPath, "package.json");

  try {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (allDeps["vitest"]) return "vitest";
    if (allDeps["jest"]) return "jest";
  } catch {
    // No package.json
  }

  // Check config files
  const configFiles = [
    { file: "vitest.config.ts", framework: "vitest" as TestFramework },
    { file: "vitest.config.js", framework: "vitest" as TestFramework },
    { file: "jest.config.ts", framework: "jest" as TestFramework },
    { file: "jest.config.js", framework: "jest" as TestFramework },
    { file: "jest.config.mjs", framework: "jest" as TestFramework },
  ];

  for (const { file, framework } of configFiles) {
    try {
      await fs.access(path.join(projectPath, file));
      return framework;
    } catch {
      // File doesn't exist
    }
  }

  return "none";
}

// ============================================================================
// Test Execution
// ============================================================================

export interface RunTestsOptions {
  projectPath: string;
  testFile?: string;
  coverage?: boolean;
  timeout?: number;
  watch?: boolean;
}

export async function runTests(options: RunTestsOptions): Promise<TestResult> {
  const {
    projectPath,
    testFile,
    coverage = false,
    timeout = 120000,
  } = options;

  const framework = await detectTestFramework(projectPath);
  logger.info("Running tests", { framework, testFile, coverage });

  if (framework === "none") {
    return {
      success: true,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      output: "No test framework detected",
      errors: [],
    };
  }

  let command = "";

  switch (framework) {
    case "vitest":
      command = `npx vitest run ${testFile || ""} ${
        coverage ? "--coverage" : ""
      } --reporter=json --outputFile=.vitest-results.json`;
      break;
    case "jest":
      command = `npx jest ${testFile || ""} ${
        coverage ? "--coverage" : ""
      } --json --outputFile=.jest-results.json`;
      break;
  }

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      timeout,
      env: { ...process.env, CI: "true" },
    });

    const duration = Date.now() - startTime;
    return await parseTestResults(framework, projectPath, stdout, stderr, duration);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; message?: string };

    // Tests might have failed but produced output
    if (execError.stdout || execError.stderr) {
      return await parseTestResults(
        framework,
        projectPath,
        execError.stdout || "",
        execError.stderr || "",
        duration
      );
    }

    return {
      success: false,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      output: execError.message || "Test execution failed",
      errors: [
        {
          testName: "Test Runner",
          message: execError.message || "Unknown error",
        },
      ],
    };
  }
}

async function parseTestResults(
  framework: TestFramework,
  projectPath: string,
  stdout: string,
  stderr: string,
  duration: number
): Promise<TestResult> {
  const result: TestResult = {
    success: false,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration,
    output: stdout + stderr,
    errors: [],
  };

  try {
    // Try to read JSON results file
    const resultsFile =
      framework === "vitest"
        ? path.join(projectPath, ".vitest-results.json")
        : path.join(projectPath, ".jest-results.json");

    try {
      const resultsContent = await fs.readFile(resultsFile, "utf-8");
      const json = JSON.parse(resultsContent);

      if (framework === "vitest") {
        result.passed = json.numPassedTests || 0;
        result.failed = json.numFailedTests || 0;
        result.skipped = json.numPendingTests || json.numTodoTests || 0;
      } else {
        result.passed = json.numPassedTests || 0;
        result.failed = json.numFailedTests || 0;
        result.skipped = json.numPendingTests || 0;

        // Extract errors from Jest results
        if (json.testResults) {
          for (const testFile of json.testResults) {
            if (testFile.status === "failed") {
              for (const assertion of testFile.assertionResults || []) {
                if (assertion.status === "failed") {
                  result.errors.push({
                    testName: assertion.fullName || assertion.title,
                    message: assertion.failureMessages?.join("\n") || "Test failed",
                  });
                }
              }
            }
          }
        }
      }

      result.success = result.failed === 0;

      // Clean up results file
      await fs.unlink(resultsFile).catch(() => {});
    } catch {
      // Fallback to parsing stdout
      const passedMatch = stdout.match(/(\d+)\s+pass(?:ed|ing)?/i);
      const failedMatch = stdout.match(/(\d+)\s+fail(?:ed|ing)?/i);
      const skippedMatch = stdout.match(/(\d+)\s+skip(?:ped)?/i);

      result.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      result.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
      result.success = result.failed === 0 && !stderr.includes("FAIL");
    }
  } catch (e) {
    logger.error("Error parsing test results", e);
  }

  return result;
}

// ============================================================================
// Run Tests for Specific Files
// ============================================================================

export async function runRelatedTests(
  projectPath: string,
  changedFile: string
): Promise<TestResult> {
  const testFile = await findRelatedTestFile(projectPath, changedFile);

  if (!testFile) {
    return {
      success: true,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      output: "No related test file found",
      errors: [],
    };
  }

  return runTests({ projectPath, testFile });
}

async function findRelatedTestFile(
  projectPath: string,
  sourceFile: string
): Promise<string | null> {
  const baseName = path.basename(sourceFile, path.extname(sourceFile));
  const dir = path.dirname(sourceFile);

  // Possible test file locations
  const possibleTestFiles = [
    path.join(dir, `${baseName}.test.ts`),
    path.join(dir, `${baseName}.test.tsx`),
    path.join(dir, `${baseName}.spec.ts`),
    path.join(dir, `${baseName}.spec.tsx`),
    path.join(dir, "__tests__", `${baseName}.test.ts`),
    path.join(dir, "__tests__", `${baseName}.test.tsx`),
    path.join(projectPath, "tests", `${baseName}.test.ts`),
    path.join(projectPath, "__tests__", `${baseName}.test.ts`),
  ];

  for (const testFile of possibleTestFiles) {
    try {
      await fs.access(testFile);
      return testFile;
    } catch {
      // File doesn't exist
    }
  }

  return null;
}

// ============================================================================
// Build Verification
// ============================================================================

export async function runBuild(
  projectPath: string,
  timeout = 180000
): Promise<BuildResult> {
  logger.info("Running build", { projectPath });
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync("npm run build", {
      cwd: projectPath,
      timeout,
      env: { ...process.env, CI: "true" },
    });

    const duration = Date.now() - startTime;

    // Parse warnings from output
    const warnings: string[] = [];
    const warningPattern = /warning[:\s]+(.+)/gi;
    let match;
    while ((match = warningPattern.exec(stdout + stderr)) !== null) {
      warnings.push(match[1].trim());
    }

    return {
      success: true,
      duration,
      errors: [],
      warnings: [...new Set(warnings)].slice(0, 20),
      output: stdout,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; message?: string };

    // Parse errors from output
    const errors: string[] = [];
    const output = (execError.stdout || "") + (execError.stderr || "");

    const errorPatterns = [
      /error[:\s]+(.+)/gi,
      /Error:\s*(.+)/g,
      /failed:\s*(.+)/gi,
      /Type error:\s*(.+)/gi,
    ];

    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        errors.push(match[1].trim());
      }
    }

    return {
      success: false,
      duration,
      errors: [...new Set(errors)].slice(0, 20),
      warnings: [],
      output,
    };
  }
}

// ============================================================================
// Type Checking
// ============================================================================

export async function runTypeCheck(
  projectPath: string,
  files?: string[]
): Promise<{
  success: boolean;
  errors: Array<{ file: string; line: number; message: string; code: string }>;
}> {
  logger.info("Running type check", { projectPath, files });

  const command = files?.length
    ? `npx tsc --noEmit ${files.join(" ")}`
    : "npx tsc --noEmit";

  try {
    await execAsync(command, {
      cwd: projectPath,
      timeout: 60000,
    });

    return { success: true, errors: [] };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    const output = (execError.stdout || "") + (execError.stderr || "");

    // Parse TypeScript errors
    const errors: Array<{ file: string; line: number; message: string; code: string }> = [];
    const errorPattern = /([^(\s]+)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/g;

    let match;
    while ((match = errorPattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        message: match[5],
        code: match[4],
      });
    }

    return { success: errors.length === 0, errors };
  }
}

// ============================================================================
// Linting
// ============================================================================

export async function runLint(
  projectPath: string,
  files?: string[]
): Promise<LintResult> {
  logger.info("Running lint", { projectPath, files });

  const command = files?.length
    ? `npx eslint ${files.join(" ")} --format json`
    : "npx eslint . --format json";

  try {
    const { stdout } = await execAsync(command, {
      cwd: projectPath,
      timeout: 60000,
    });

    // Parse ESLint JSON output
    try {
      const results = JSON.parse(stdout);
      const errors: LintResult["errors"] = [];
      const warnings: LintResult["warnings"] = [];
      let fixable = 0;

      for (const file of results) {
        for (const message of file.messages || []) {
          const entry = {
            file: file.filePath,
            line: message.line,
            column: message.column,
            message: message.message,
            rule: message.ruleId || "unknown",
            severity: message.severity === 2 ? "error" as const : "warning" as const,
          };

          if (message.severity === 2) {
            errors.push(entry);
          } else {
            warnings.push(entry);
          }

          if (message.fix) fixable++;
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
        fixable,
      };
    } catch {
      return { success: true, errors: [], warnings: [], fixable: 0 };
    }
  } catch (error: unknown) {
    const execError = error as { stdout?: string };
    // ESLint exits with code 1 if there are errors
    try {
      const results = JSON.parse(execError.stdout || "[]");
      const errors: LintResult["errors"] = [];
      const warnings: LintResult["warnings"] = [];
      let fixable = 0;

      for (const file of results) {
        for (const message of file.messages || []) {
          const entry = {
            file: file.filePath,
            line: message.line,
            column: message.column,
            message: message.message,
            rule: message.ruleId || "unknown",
            severity: message.severity === 2 ? "error" as const : "warning" as const,
          };

          if (message.severity === 2) {
            errors.push(entry);
          } else {
            warnings.push(entry);
          }

          if (message.fix) fixable++;
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
        fixable,
      };
    } catch {
      return {
        success: false,
        errors: [],
        warnings: [],
        fixable: 0,
      };
    }
  }
}
