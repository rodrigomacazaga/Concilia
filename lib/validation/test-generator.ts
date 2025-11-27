// ============================================================================
// Test Generator - TDD Templates for Code Generation
// ============================================================================

import { logger } from "@/lib/observability/logger";

// ============================================================================
// Types
// ============================================================================

export interface TestTemplate {
  name: string;
  description: string;
  template: string;
  imports: string[];
  setupCode?: string;
  teardownCode?: string;
}

export interface GeneratedTest {
  fileName: string;
  content: string;
  type: "unit" | "integration" | "e2e";
  coverage: string[];
}

export interface TestGenerationContext {
  feature: string;
  description: string;
  componentPath?: string;
  apiRoute?: string;
  dependencies?: string[];
  expectedBehavior: string[];
  edgeCases?: string[];
  framework: "vitest" | "jest";
}

// ============================================================================
// Test Templates
// ============================================================================

const REACT_COMPONENT_TEMPLATE = `
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
{{IMPORTS}}

describe("{{COMPONENT_NAME}}", () => {
  {{SETUP}}

  describe("Rendering", () => {
    it("should render without crashing", () => {
      render(<{{COMPONENT_NAME}} {{DEFAULT_PROPS}} />);
      expect(screen.getByTestId("{{TEST_ID}}")).toBeInTheDocument();
    });

    {{RENDER_TESTS}}
  });

  describe("Interactions", () => {
    {{INTERACTION_TESTS}}
  });

  describe("Edge Cases", () => {
    {{EDGE_CASE_TESTS}}
  });

  {{TEARDOWN}}
});
`;

const API_ROUTE_TEMPLATE = `
import { NextRequest } from "next/server";
{{IMPORTS}}

// Mock dependencies
{{MOCKS}}

describe("{{ROUTE_NAME}} API", () => {
  {{SETUP}}

  describe("GET", () => {
    it("should return 200 with valid request", async () => {
      const request = new NextRequest("http://localhost{{ROUTE_PATH}}");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 400 with invalid parameters", async () => {
      const request = new NextRequest("http://localhost{{ROUTE_PATH}}");
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    {{GET_TESTS}}
  });

  describe("POST", () => {
    it("should create resource with valid data", async () => {
      const request = new NextRequest("http://localhost{{ROUTE_PATH}}", {
        method: "POST",
        body: JSON.stringify({{VALID_PAYLOAD}}),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should return 400 with invalid data", async () => {
      const request = new NextRequest("http://localhost{{ROUTE_PATH}}", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    {{POST_TESTS}}
  });

  {{TEARDOWN}}
});
`;

const HOOK_TEMPLATE = `
import { renderHook, act, waitFor } from "@testing-library/react";
{{IMPORTS}}

describe("{{HOOK_NAME}}", () => {
  {{SETUP}}

  it("should initialize with default values", () => {
    const { result } = renderHook(() => {{HOOK_NAME}}({{DEFAULT_ARGS}}));

    {{INITIAL_STATE_ASSERTIONS}}
  });

  it("should update state correctly", async () => {
    const { result } = renderHook(() => {{HOOK_NAME}}({{DEFAULT_ARGS}}));

    await act(async () => {
      {{STATE_UPDATE_ACTION}}
    });

    {{UPDATED_STATE_ASSERTIONS}}
  });

  describe("Edge Cases", () => {
    {{EDGE_CASE_TESTS}}
  });

  {{TEARDOWN}}
});
`;

const UTILITY_TEMPLATE = `
{{IMPORTS}}

describe("{{UTIL_NAME}}", () => {
  {{SETUP}}

  describe("Basic functionality", () => {
    it("should work with valid input", () => {
      const result = {{UTIL_NAME}}({{VALID_INPUT}});
      expect(result).{{EXPECTED_OUTPUT}};
    });

    it("should handle edge cases", () => {
      {{EDGE_CASE_TESTS}}
    });
  });

  describe("Error handling", () => {
    it("should handle invalid input gracefully", () => {
      {{ERROR_TESTS}}
    });
  });

  {{TEARDOWN}}
});
`;

const SERVICE_TEMPLATE = `
{{IMPORTS}}

// Mock external dependencies
{{MOCKS}}

describe("{{SERVICE_NAME}}", () => {
  {{SETUP}}

  describe("{{METHOD_NAME}}", () => {
    it("should complete successfully with valid input", async () => {
      const result = await {{SERVICE_NAME}}.{{METHOD_NAME}}({{VALID_INPUT}});

      expect(result).toBeDefined();
      {{SUCCESS_ASSERTIONS}}
    });

    it("should handle errors gracefully", async () => {
      {{ERROR_MOCK_SETUP}}

      await expect({{SERVICE_NAME}}.{{METHOD_NAME}}({{INVALID_INPUT}}))
        .rejects.toThrow({{EXPECTED_ERROR}});
    });

    {{ADDITIONAL_TESTS}}
  });

  {{TEARDOWN}}
});
`;

// ============================================================================
// Template Registry
// ============================================================================

const templates: Record<string, TestTemplate> = {
  "react-component": {
    name: "React Component",
    description: "Test template for React components",
    template: REACT_COMPONENT_TEMPLATE,
    imports: [
      '@testing-library/react',
      '@testing-library/user-event',
    ],
    setupCode: `
  beforeEach(() => {
    jest.clearAllMocks();
  });
`,
  },
  "api-route": {
    name: "API Route",
    description: "Test template for Next.js API routes",
    template: API_ROUTE_TEMPLATE,
    imports: ['next/server'],
    setupCode: `
  beforeEach(() => {
    jest.clearAllMocks();
  });
`,
  },
  "hook": {
    name: "React Hook",
    description: "Test template for custom React hooks",
    template: HOOK_TEMPLATE,
    imports: ['@testing-library/react'],
  },
  "utility": {
    name: "Utility Function",
    description: "Test template for utility functions",
    template: UTILITY_TEMPLATE,
    imports: [],
  },
  "service": {
    name: "Service",
    description: "Test template for service classes/modules",
    template: SERVICE_TEMPLATE,
    imports: [],
    setupCode: `
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
`,
  },
};

// ============================================================================
// Test Generation Functions
// ============================================================================

export function detectTestType(
  filePath: string
): "react-component" | "api-route" | "hook" | "utility" | "service" {
  if (filePath.includes("/api/") && filePath.includes("route.ts")) {
    return "api-route";
  }
  if (filePath.includes("/hooks/") || filePath.match(/use[A-Z]/)) {
    return "hook";
  }
  if (filePath.includes("/components/") || filePath.endsWith(".tsx")) {
    return "react-component";
  }
  if (filePath.includes("/services/") || filePath.includes("/lib/")) {
    return "service";
  }
  return "utility";
}

export function generateTestFileName(
  sourcePath: string,
  testType: "unit" | "integration" | "e2e" = "unit"
): string {
  const parts = sourcePath.split("/");
  const fileName = parts[parts.length - 1];
  const baseName = fileName.replace(/\.(ts|tsx)$/, "");

  switch (testType) {
    case "integration":
      return `${baseName}.integration.test.ts`;
    case "e2e":
      return `${baseName}.e2e.test.ts`;
    default:
      return `${baseName}.test.ts`;
  }
}

export function generateTestPath(
  sourcePath: string,
  testType: "unit" | "integration" | "e2e" = "unit"
): string {
  // Place tests alongside source files
  const parts = sourcePath.split("/");
  parts[parts.length - 1] = generateTestFileName(sourcePath, testType);

  // Or use __tests__ directory
  // const dirParts = parts.slice(0, -1);
  // return [...dirParts, "__tests__", generateTestFileName(sourcePath, testType)].join("/");

  return parts.join("/");
}

export async function generateTestsForFeature(
  context: TestGenerationContext
): Promise<GeneratedTest[]> {
  const tests: GeneratedTest[] = [];

  logger.info("Generating tests for feature", {
    feature: context.feature,
    framework: context.framework,
  });

  // Generate component tests if applicable
  if (context.componentPath) {
    const componentTest = generateComponentTest(context);
    if (componentTest) {
      tests.push(componentTest);
    }
  }

  // Generate API tests if applicable
  if (context.apiRoute) {
    const apiTest = generateApiTest(context);
    if (apiTest) {
      tests.push(apiTest);
    }
  }

  // Generate integration test
  const integrationTest = generateIntegrationTest(context);
  tests.push(integrationTest);

  return tests;
}

function generateComponentTest(
  context: TestGenerationContext
): GeneratedTest | null {
  if (!context.componentPath) return null;

  const componentName = extractComponentName(context.componentPath);
  const testId = toKebabCase(componentName);

  // Generate render tests from expected behavior
  const renderTests = context.expectedBehavior
    .filter((b) => b.includes("display") || b.includes("show") || b.includes("render"))
    .map((behavior) => `
    it("should ${behavior}", () => {
      render(<${componentName} />);
      // TODO: Add specific assertions for: ${behavior}
    });
`).join("\n");

  // Generate interaction tests
  const interactionTests = context.expectedBehavior
    .filter((b) => b.includes("click") || b.includes("input") || b.includes("submit") || b.includes("interact"))
    .map((behavior) => `
    it("should ${behavior}", async () => {
      const user = userEvent.setup();
      render(<${componentName} />);

      // TODO: Add interaction for: ${behavior}
      // await user.click(screen.getByRole("button"));
    });
`).join("\n");

  // Generate edge case tests
  const edgeCaseTests = (context.edgeCases || [])
    .map((edge) => `
    it("should handle ${edge}", () => {
      render(<${componentName} />);
      // TODO: Add assertion for edge case: ${edge}
    });
`).join("\n");

  let content = templates["react-component"].template
    .replace(/\{\{COMPONENT_NAME\}\}/g, componentName)
    .replace(/\{\{TEST_ID\}\}/g, testId)
    .replace(/\{\{DEFAULT_PROPS\}\}/g, "")
    .replace(/\{\{IMPORTS\}\}/g, `import ${componentName} from "${context.componentPath}";`)
    .replace(/\{\{SETUP\}\}/g, templates["react-component"].setupCode || "")
    .replace(/\{\{TEARDOWN\}\}/g, "")
    .replace(/\{\{RENDER_TESTS\}\}/g, renderTests || "// Add render tests")
    .replace(/\{\{INTERACTION_TESTS\}\}/g, interactionTests || "// Add interaction tests")
    .replace(/\{\{EDGE_CASE_TESTS\}\}/g, edgeCaseTests || "// Add edge case tests");

  // Adjust for vitest vs jest
  if (context.framework === "vitest") {
    content = content.replace(/jest\./g, "vi.");
    content = `import { describe, it, expect, beforeEach, vi } from "vitest";\n${content}`;
  }

  return {
    fileName: generateTestFileName(context.componentPath),
    content,
    type: "unit",
    coverage: [context.componentPath],
  };
}

function generateApiTest(context: TestGenerationContext): GeneratedTest | null {
  if (!context.apiRoute) return null;

  const routeName = extractRouteName(context.apiRoute);
  const routePath = context.apiRoute.replace(/.*\/app\/api/, "/api").replace("/route.ts", "");

  // Generate GET tests from expected behavior
  const getTests = context.expectedBehavior
    .filter((b) => b.includes("fetch") || b.includes("get") || b.includes("list") || b.includes("retrieve"))
    .map((behavior) => `
    it("should ${behavior}", async () => {
      const request = new NextRequest("http://localhost${routePath}?sessionId=test");
      const response = await GET(request);

      // TODO: Add assertion for: ${behavior}
      expect(response.status).toBe(200);
    });
`).join("\n");

  // Generate POST tests
  const postTests = context.expectedBehavior
    .filter((b) => b.includes("create") || b.includes("add") || b.includes("submit") || b.includes("update"))
    .map((behavior) => `
    it("should ${behavior}", async () => {
      const request = new NextRequest("http://localhost${routePath}", {
        method: "POST",
        body: JSON.stringify({ sessionId: "test" }),
      });
      const response = await POST(request);

      // TODO: Add assertion for: ${behavior}
      expect(response.status).toBe(200);
    });
`).join("\n");

  let content = templates["api-route"].template
    .replace(/\{\{ROUTE_NAME\}\}/g, routeName)
    .replace(/\{\{ROUTE_PATH\}\}/g, routePath)
    .replace(/\{\{IMPORTS\}\}/g, `import { GET, POST } from "${context.apiRoute}";`)
    .replace(/\{\{MOCKS\}\}/g, "// Add mocks as needed")
    .replace(/\{\{SETUP\}\}/g, templates["api-route"].setupCode || "")
    .replace(/\{\{TEARDOWN\}\}/g, "")
    .replace(/\{\{VALID_PAYLOAD\}\}/g, "{ sessionId: 'test' }")
    .replace(/\{\{GET_TESTS\}\}/g, getTests || "// Add GET tests")
    .replace(/\{\{POST_TESTS\}\}/g, postTests || "// Add POST tests");

  if (context.framework === "vitest") {
    content = content.replace(/jest\./g, "vi.");
    content = `import { describe, it, expect, beforeEach, vi } from "vitest";\n${content}`;
  }

  return {
    fileName: generateTestFileName(context.apiRoute),
    content,
    type: "unit",
    coverage: [context.apiRoute],
  };
}

function generateIntegrationTest(context: TestGenerationContext): GeneratedTest {
  const testName = toKebabCase(context.feature);

  const behaviorTests = context.expectedBehavior
    .map((behavior) => `
  it("should ${behavior}", async () => {
    // TODO: Implement integration test for: ${behavior}
  });
`).join("\n");

  let content = `
// Integration tests for: ${context.feature}
// ${context.description}

import { describe, it, expect, beforeAll, afterAll } from "${context.framework}";

describe("${context.feature} Integration", () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

${behaviorTests}

  describe("End-to-end flow", () => {
    it("should complete the full ${context.feature} workflow", async () => {
      // TODO: Implement full workflow test
      ${context.expectedBehavior.map((b) => `// - ${b}`).join("\n      ")}
    });
  });
});
`;

  return {
    fileName: `${testName}.integration.test.ts`,
    content,
    type: "integration",
    coverage: [
      context.componentPath,
      context.apiRoute,
      ...(context.dependencies || []),
    ].filter(Boolean) as string[],
  };
}

// ============================================================================
// TDD Prompt Generation
// ============================================================================

export function generateTDDPrompt(context: TestGenerationContext): string {
  return `
## TDD Requirements for: ${context.feature}

### Description
${context.description}

### Expected Behavior (Test Cases)
${context.expectedBehavior.map((b, i) => `${i + 1}. ${b}`).join("\n")}

### Edge Cases to Cover
${(context.edgeCases || ["No specific edge cases defined"]).map((e, i) => `${i + 1}. ${e}`).join("\n")}

### Test-First Development Steps

1. **Write Failing Tests First**
   - Create test file before implementation
   - Define all expected behaviors as test cases
   - Tests should fail initially (Red phase)

2. **Implement Minimum Code**
   - Write just enough code to pass tests
   - Focus on functionality, not optimization
   - Tests should pass (Green phase)

3. **Refactor**
   - Improve code quality
   - Ensure tests still pass
   - Optimize if needed (Refactor phase)

### Dependencies to Verify
${(context.dependencies || ["None specified"]).join("\n- ")}

### Validation Checklist
- [ ] All tests pass
- [ ] Type checking passes (tsc --noEmit)
- [ ] No lint errors
- [ ] Code coverage meets threshold
- [ ] Integration tests pass
`;
}

export function generateTestRequirements(
  feature: string,
  description: string,
  codeSnippet?: string
): string {
  // Analyze code snippet to infer test requirements
  const requirements: string[] = [];

  if (codeSnippet) {
    // Detect component patterns
    if (codeSnippet.includes("export default function") || codeSnippet.includes("export const")) {
      requirements.push("Unit tests for exported functions/components");
    }

    // Detect API patterns
    if (codeSnippet.includes("GET") || codeSnippet.includes("POST")) {
      requirements.push("API endpoint tests for each HTTP method");
      requirements.push("Error handling tests (400, 500 responses)");
    }

    // Detect state management
    if (codeSnippet.includes("useState") || codeSnippet.includes("useReducer")) {
      requirements.push("State initialization tests");
      requirements.push("State update tests");
    }

    // Detect effects
    if (codeSnippet.includes("useEffect")) {
      requirements.push("Effect lifecycle tests");
      requirements.push("Cleanup function tests");
    }

    // Detect async operations
    if (codeSnippet.includes("async") || codeSnippet.includes("await")) {
      requirements.push("Async operation success tests");
      requirements.push("Async error handling tests");
    }

    // Detect error boundaries
    if (codeSnippet.includes("try") || codeSnippet.includes("catch")) {
      requirements.push("Error handling path tests");
    }
  }

  if (requirements.length === 0) {
    requirements.push("Basic functionality tests");
    requirements.push("Edge case tests");
    requirements.push("Error handling tests");
  }

  return `
## Test Requirements for: ${feature}

${description}

### Required Tests:
${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

### Test Quality Standards:
- Each test should be independent
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and failure paths
`;
}

// ============================================================================
// Helpers
// ============================================================================

function extractComponentName(path: string): string {
  const fileName = path.split("/").pop() || "";
  return fileName.replace(/\.(tsx?|jsx?)$/, "");
}

function extractRouteName(path: string): string {
  const parts = path.split("/");
  const apiIndex = parts.indexOf("api");
  if (apiIndex !== -1 && apiIndex < parts.length - 1) {
    return parts.slice(apiIndex + 1, -1).join("-") || "root";
  }
  return "api";
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

// ============================================================================
// Export
// ============================================================================

export { templates };
