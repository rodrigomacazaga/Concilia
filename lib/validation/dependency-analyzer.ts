// ============================================================================
// Dependency Analyzer - Verifies required dependencies exist before development
// ============================================================================

import fs from "fs/promises";
import path from "path";
import { logger } from "@/lib/observability/logger";
import type { DependencyCheck, DependencyAnalysis, DependencyType } from "./types";

export interface AnalysisContext {
  projectPath: string;
  serviceName?: string;
  requestedFeature: string;
}

export interface RequiredDependencies {
  apis?: string[];
  tables?: string[];
  components?: string[];
  types?: string[];
  services?: string[];
  hooks?: string[];
  utils?: string[];
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export async function analyzeDependencies(
  context: AnalysisContext,
  requiredDependencies: RequiredDependencies
): Promise<DependencyAnalysis> {
  const checks: DependencyCheck[] = [];

  logger.info("Analyzing dependencies", {
    feature: context.requestedFeature,
    dependencies: requiredDependencies,
  });

  // Check APIs
  if (requiredDependencies.apis) {
    for (const api of requiredDependencies.apis) {
      const check = await checkAPIExists(context, api);
      checks.push(check);
    }
  }

  // Check Database tables
  if (requiredDependencies.tables) {
    for (const table of requiredDependencies.tables) {
      const check = await checkTableExists(context, table);
      checks.push(check);
    }
  }

  // Check Components
  if (requiredDependencies.components) {
    for (const component of requiredDependencies.components) {
      const check = await checkComponentExists(context, component);
      checks.push(check);
    }
  }

  // Check Types/Interfaces
  if (requiredDependencies.types) {
    for (const type of requiredDependencies.types) {
      const check = await checkTypeExists(context, type);
      checks.push(check);
    }
  }

  // Check Services
  if (requiredDependencies.services) {
    for (const service of requiredDependencies.services) {
      const check = await checkServiceExists(context, service);
      checks.push(check);
    }
  }

  // Check Hooks
  if (requiredDependencies.hooks) {
    for (const hook of requiredDependencies.hooks) {
      const check = await checkHookExists(context, hook);
      checks.push(check);
    }
  }

  // Check Utils
  if (requiredDependencies.utils) {
    for (const util of requiredDependencies.utils) {
      const check = await checkUtilExists(context, util);
      checks.push(check);
    }
  }

  const missing = checks.filter((c) => !c.exists);
  const criticalMissing = missing.filter((c) => c.critical);
  const allSatisfied = missing.length === 0;

  const suggestions = generateSuggestions(missing);

  logger.info("Dependency analysis complete", {
    total: checks.length,
    missing: missing.length,
    critical: criticalMissing.length,
    satisfied: allSatisfied,
  });

  return {
    allSatisfied,
    checks,
    missing,
    criticalMissing,
    suggestions,
  };
}

// ============================================================================
// Individual Dependency Checks
// ============================================================================

async function checkAPIExists(
  context: AnalysisContext,
  apiEndpoint: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  // Check Memory Bank API-CONTRACTS.md
  const mbPaths = [
    serviceName
      ? path.join(projectPath, serviceName, "memory-bank", "API-CONTRACTS.md")
      : null,
    path.join(projectPath, "memory-bank", "03-API-CONTRACTS-GLOBAL.md"),
  ].filter(Boolean) as string[];

  let exists = false;
  let details = "";
  let foundPath = "";

  // Check Memory Bank first
  for (const mbPath of mbPaths) {
    try {
      const content = await fs.readFile(mbPath, "utf-8");
      if (content.toLowerCase().includes(apiEndpoint.toLowerCase())) {
        exists = true;
        details = "Documented in Memory Bank";
        foundPath = mbPath;
        break;
      }
    } catch {
      // File doesn't exist
    }
  }

  // Check actual route files
  if (!exists) {
    const routePaths = [
      path.join(projectPath, "app", "api"),
      path.join(projectPath, "src", "routes"),
      serviceName ? path.join(projectPath, serviceName, "src", "routes") : null,
    ].filter(Boolean) as string[];

    for (const routePath of routePaths) {
      try {
        const files = await findFilesRecursive(routePath, [".ts", ".js"]);
        for (const file of files) {
          // Check if the route file path matches the API endpoint
          const relativePath = path.relative(routePath, file);
          const routeFromPath = "/" + relativePath
            .replace(/route\.(ts|js)$/, "")
            .replace(/\\/g, "/")
            .replace(/\/$/, "");

          if (routeFromPath.includes(apiEndpoint.replace(/^\/api/, ""))) {
            exists = true;
            details = `Implemented at ${path.relative(projectPath, file)}`;
            foundPath = file;
            break;
          }
        }
        if (exists) break;
      } catch {
        // Directory doesn't exist
      }
    }
  }

  return {
    type: "api",
    name: apiEndpoint,
    exists,
    path: foundPath,
    details: details || "Not found in project",
    critical: true, // APIs are critical dependencies
  };
}

async function checkTableExists(
  context: AnalysisContext,
  tableName: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  // Check Memory Bank DATABASE-SCHEMA.md
  const mbPaths = [
    serviceName
      ? path.join(projectPath, serviceName, "memory-bank", "DATABASE-SCHEMA.md")
      : null,
    path.join(projectPath, "memory-bank", "04-DATABASE-SCHEMA-GLOBAL.md"),
  ].filter(Boolean) as string[];

  let exists = false;
  let details = "";
  let foundPath = "";

  for (const mbPath of mbPaths) {
    try {
      const content = await fs.readFile(mbPath, "utf-8");
      if (content.toLowerCase().includes(tableName.toLowerCase())) {
        exists = true;
        details = "Documented in Memory Bank";
        foundPath = mbPath;
        break;
      }
    } catch {
      // File doesn't exist
    }
  }

  // Check schema files
  if (!exists) {
    const schemaPaths = [
      path.join(projectPath, "prisma", "schema.prisma"),
      path.join(projectPath, "drizzle", "schema.ts"),
      serviceName
        ? path.join(projectPath, serviceName, "prisma", "schema.prisma")
        : null,
    ].filter(Boolean) as string[];

    for (const schemaPath of schemaPaths) {
      try {
        const content = await fs.readFile(schemaPath, "utf-8");
        const tablePattern = new RegExp(
          `(model|table)\\s+${tableName}\\s*\\{`,
          "i"
        );
        if (tablePattern.test(content)) {
          exists = true;
          details = `Defined in ${path.relative(projectPath, schemaPath)}`;
          foundPath = schemaPath;
          break;
        }
      } catch {
        // File doesn't exist
      }
    }
  }

  return {
    type: "database",
    name: tableName,
    exists,
    path: foundPath,
    details: details || "Not found in project",
    critical: true, // Database tables are critical
  };
}

async function checkComponentExists(
  context: AnalysisContext,
  componentName: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  const searchPaths = [
    path.join(projectPath, "app", "components"),
    path.join(projectPath, "src", "components"),
    path.join(projectPath, "components"),
    serviceName
      ? path.join(projectPath, serviceName, "src", "components")
      : null,
  ].filter(Boolean) as string[];

  for (const searchPath of searchPaths) {
    try {
      const files = await findFilesRecursive(searchPath, [".tsx", ".jsx"]);
      for (const file of files) {
        const filename = path.basename(file, path.extname(file));
        // Match PascalCase or kebab-case
        const kebabName = componentName
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "");

        if (
          filename.toLowerCase() === componentName.toLowerCase() ||
          filename.toLowerCase() === kebabName
        ) {
          return {
            type: "component",
            name: componentName,
            exists: true,
            path: file,
            details: `Found at ${path.relative(projectPath, file)}`,
            critical: false,
          };
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return {
    type: "component",
    name: componentName,
    exists: false,
    details: "Not found in project",
    critical: false, // Components can be created
  };
}

async function checkTypeExists(
  context: AnalysisContext,
  typeName: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  const searchPaths = [
    path.join(projectPath, "types"),
    path.join(projectPath, "src", "types"),
    path.join(projectPath, "lib", "types"),
    path.join(projectPath, "app", "lib"),
    serviceName ? path.join(projectPath, serviceName, "src", "types") : null,
  ].filter(Boolean) as string[];

  for (const searchPath of searchPaths) {
    try {
      const files = await findFilesRecursive(searchPath, [".ts", ".d.ts"]);
      for (const file of files) {
        const content = await fs.readFile(file, "utf-8");
        const patterns = [
          new RegExp(`interface\\s+${typeName}\\s*[{<]`, "m"),
          new RegExp(`type\\s+${typeName}\\s*=`, "m"),
          new RegExp(`export\\s+interface\\s+${typeName}`, "m"),
          new RegExp(`export\\s+type\\s+${typeName}`, "m"),
        ];

        if (patterns.some((p) => p.test(content))) {
          return {
            type: "type",
            name: typeName,
            exists: true,
            path: file,
            details: `Defined in ${path.relative(projectPath, file)}`,
            critical: false,
          };
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return {
    type: "type",
    name: typeName,
    exists: false,
    details: "Not found in project",
    critical: false, // Types can be created inline
  };
}

async function checkServiceExists(
  context: AnalysisContext,
  serviceName: string
): Promise<DependencyCheck> {
  const { projectPath } = context;

  const servicePath = path.join(projectPath, serviceName);
  const mbIndexPath = path.join(
    projectPath,
    "memory-bank",
    "02-MICROSERVICES-INDEX.md"
  );

  let exists = false;
  let details = "";

  // Check if directory exists
  try {
    await fs.access(servicePath);
    exists = true;
    details = `Directory exists: ${serviceName}/`;
  } catch {
    // Directory doesn't exist
  }

  // Check Memory Bank index
  if (!exists) {
    try {
      const content = await fs.readFile(mbIndexPath, "utf-8");
      if (content.includes(serviceName)) {
        exists = true;
        details = "Registered in Memory Bank (may need initialization)";
      }
    } catch {
      // File doesn't exist
    }
  }

  return {
    type: "service",
    name: serviceName,
    exists,
    path: servicePath,
    details: details || "Service not found",
    critical: true, // Services are critical
  };
}

async function checkHookExists(
  context: AnalysisContext,
  hookName: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  const searchPaths = [
    path.join(projectPath, "lib", "hooks"),
    path.join(projectPath, "app", "hooks"),
    path.join(projectPath, "src", "hooks"),
    path.join(projectPath, "hooks"),
    serviceName ? path.join(projectPath, serviceName, "src", "hooks") : null,
  ].filter(Boolean) as string[];

  for (const searchPath of searchPaths) {
    try {
      const files = await findFilesRecursive(searchPath, [".ts", ".tsx"]);
      for (const file of files) {
        const filename = path.basename(file, path.extname(file));
        if (
          filename.toLowerCase() === hookName.toLowerCase() ||
          filename.toLowerCase() === hookName.replace(/^use/, "").toLowerCase()
        ) {
          return {
            type: "hook",
            name: hookName,
            exists: true,
            path: file,
            details: `Found at ${path.relative(projectPath, file)}`,
            critical: false,
          };
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return {
    type: "hook",
    name: hookName,
    exists: false,
    details: "Not found in project",
    critical: false,
  };
}

async function checkUtilExists(
  context: AnalysisContext,
  utilName: string
): Promise<DependencyCheck> {
  const { projectPath, serviceName } = context;

  const searchPaths = [
    path.join(projectPath, "lib"),
    path.join(projectPath, "utils"),
    path.join(projectPath, "src", "utils"),
    path.join(projectPath, "src", "lib"),
    serviceName ? path.join(projectPath, serviceName, "src", "lib") : null,
  ].filter(Boolean) as string[];

  for (const searchPath of searchPaths) {
    try {
      const files = await findFilesRecursive(searchPath, [".ts", ".js"]);
      for (const file of files) {
        const content = await fs.readFile(file, "utf-8");
        const patterns = [
          new RegExp(`export\\s+(async\\s+)?function\\s+${utilName}`, "m"),
          new RegExp(`export\\s+const\\s+${utilName}`, "m"),
          new RegExp(`export\\s+{[^}]*${utilName}[^}]*}`, "m"),
        ];

        if (patterns.some((p) => p.test(content))) {
          return {
            type: "util",
            name: utilName,
            exists: true,
            path: file,
            details: `Found in ${path.relative(projectPath, file)}`,
            critical: false,
          };
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return {
    type: "util",
    name: utilName,
    exists: false,
    details: "Not found in project",
    critical: false,
  };
}

// ============================================================================
// Code Analysis - Infer dependencies from generated code
// ============================================================================

export function inferDependenciesFromCode(code: string): RequiredDependencies {
  const dependencies: RequiredDependencies = {
    apis: [],
    tables: [],
    components: [],
    types: [],
    services: [],
    hooks: [],
    utils: [],
  };

  // Detect API calls
  const apiPatterns = [
    /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /api\s*\.\s*(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const apiPath = (match[2] || match[1])
        .replace(/\$\{[^}]+\}/g, ":param")
        .replace(/\?.*$/, "");
      if (apiPath.startsWith("/api/") || apiPath.startsWith("api/")) {
        dependencies.apis!.push(apiPath);
      }
    }
  }

  // Detect component imports
  const componentPattern =
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@?\/?(?:components|app\/components)\/([^'"]+)['"]/g;
  let match;
  while ((match = componentPattern.exec(code)) !== null) {
    const components = match[1].split(",").map((c) => c.trim());
    dependencies.components!.push(...components);
  }

  // Detect type imports
  const typePattern =
    /import\s*(?:type\s*)?\{\s*([^}]+)\s*\}\s*from\s*['"]@?\/?(?:types|lib\/types|app\/lib)\/([^'"]+)['"]/g;
  while ((match = typePattern.exec(code)) !== null) {
    const types = match[1]
      .split(",")
      .map((t) => t.trim().replace(/^type\s+/, ""));
    dependencies.types!.push(...types);
  }

  // Detect database operations (Prisma, Drizzle)
  const dbPattern = /(?:prisma|db)\.(\w+)\./g;
  while ((match = dbPattern.exec(code)) !== null) {
    dependencies.tables!.push(match[1]);
  }

  // Detect hook usage
  const hookPattern = /\b(use[A-Z][a-zA-Z]+)\s*\(/g;
  const standardHooks = [
    "useState",
    "useEffect",
    "useCallback",
    "useMemo",
    "useRef",
    "useContext",
    "useReducer",
    "useLayoutEffect",
    "useImperativeHandle",
    "useDebugValue",
  ];
  while ((match = hookPattern.exec(code)) !== null) {
    if (!standardHooks.includes(match[1])) {
      dependencies.hooks!.push(match[1]);
    }
  }

  // Dedupe all arrays
  dependencies.apis = [...new Set(dependencies.apis)];
  dependencies.tables = [...new Set(dependencies.tables)];
  dependencies.components = [...new Set(dependencies.components)];
  dependencies.types = [...new Set(dependencies.types)];
  dependencies.hooks = [...new Set(dependencies.hooks)];
  dependencies.utils = [...new Set(dependencies.utils)];

  return dependencies;
}

// ============================================================================
// Suggestion Generator
// ============================================================================

function generateSuggestions(missing: DependencyCheck[]): string[] {
  const suggestions: string[] = [];

  for (const dep of missing) {
    switch (dep.type) {
      case "api":
        suggestions.push(
          `Create API endpoint ${dep.name} before consuming it`
        );
        break;
      case "database":
        suggestions.push(
          `Create table ${dep.name} and document in DATABASE-SCHEMA.md`
        );
        break;
      case "component":
        suggestions.push(
          `Create component ${dep.name} or use existing UI library component`
        );
        break;
      case "type":
        suggestions.push(`Define interface/type ${dep.name} in types/`);
        break;
      case "service":
        suggestions.push(
          `Initialize microservice ${dep.name} before integration`
        );
        break;
      case "hook":
        suggestions.push(`Create hook ${dep.name} in lib/hooks/`);
        break;
      case "util":
        suggestions.push(`Create utility function ${dep.name} in lib/`);
        break;
    }
  }

  return suggestions;
}

// ============================================================================
// Utility Functions
// ============================================================================

async function findFilesRecursive(
  dir: string,
  extensions: string[]
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== ".next"
      ) {
        const subFiles = await findFilesRecursive(fullPath, extensions);
        files.push(...subFiles);
      } else if (
        entry.isFile() &&
        extensions.some((ext) => entry.name.endsWith(ext))
      ) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not accessible
  }

  return files;
}

export { findFilesRecursive };
