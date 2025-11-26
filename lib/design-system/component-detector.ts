/**
 * Detector de Componentes UI y Violaciones de Estilo
 *
 * Analiza código JSX/TSX para detectar componentes UI y posibles
 * violaciones del Design System.
 */

export interface DetectedComponent {
  name: string;
  code: string;
  classes: string[];
  type: 'button' | 'input' | 'card' | 'modal' | 'alert' | 'badge' | 'table' | 'form' | 'nav' | 'other';
  isNew: boolean;
  file?: string;
}

export interface StyleViolation {
  type: 'hardcoded-color' | 'inline-style' | 'arbitrary-value' | 'direct-color' | 'magic-number';
  code: string;
  suggestion: string;
  line?: number;
}

export interface DetectionResult {
  components: DetectedComponent[];
  violations: StyleViolation[];
  newClasses: string[];
  summary: {
    totalComponents: number;
    newComponents: number;
    violationsCount: number;
  };
}

/**
 * Detecta componentes UI en código JSX/TSX
 */
export function detectUIComponents(code: string, fileName?: string): DetectedComponent[] {
  const components: DetectedComponent[] = [];

  // Patrones para detectar diferentes tipos de componentes
  const patterns: { regex: RegExp; type: DetectedComponent['type'] }[] = [
    // Buttons
    {
      regex: /<button[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/button>/gi,
      type: 'button'
    },
    {
      regex: /<Button[^>]*(?:className="([^"]*)"|variant="([^"]*)")?[^>]*>[\s\S]*?<\/Button>/gi,
      type: 'button'
    },

    // Inputs
    {
      regex: /<input[^>]*className="([^"]*)"[^>]*\/?>/gi,
      type: 'input'
    },
    {
      regex: /<Input[^>]*className="([^"]*)"[^>]*\/?>/gi,
      type: 'input'
    },
    {
      regex: /<textarea[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/textarea>/gi,
      type: 'input'
    },

    // Cards (detectar por clases típicas de card)
    {
      regex: /<div[^>]*className="([^"]*(?:rounded-(?:lg|xl|2xl)[^"]*(?:border|shadow)|card)[^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
      type: 'card'
    },
    {
      regex: /<Card[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/Card>/gi,
      type: 'card'
    },

    // Modals
    {
      regex: /<div[^>]*className="([^"]*(?:fixed[^"]*(?:inset|z-)|modal|dialog|overlay)[^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
      type: 'modal'
    },
    {
      regex: /<Dialog[^>]*>[\s\S]*?<\/Dialog>/gi,
      type: 'modal'
    },

    // Alerts
    {
      regex: /<div[^>]*className="([^"]*(?:alert|bg-(?:red|green|yellow|blue)-(?:50|100)|border-l-4)[^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
      type: 'alert'
    },
    {
      regex: /<Alert[^>]*(?:variant="([^"]*)")?[^>]*>[\s\S]*?<\/Alert>/gi,
      type: 'alert'
    },

    // Badges
    {
      regex: /<span[^>]*className="([^"]*(?:rounded-full[^"]*px-|badge|inline-flex[^"]*rounded)[^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
      type: 'badge'
    },
    {
      regex: /<Badge[^>]*(?:variant="([^"]*)")?[^>]*>[\s\S]*?<\/Badge>/gi,
      type: 'badge'
    },

    // Tables
    {
      regex: /<table[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/table>/gi,
      type: 'table'
    },
    {
      regex: /<Table[^>]*>[\s\S]*?<\/Table>/gi,
      type: 'table'
    },

    // Forms
    {
      regex: /<form[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/form>/gi,
      type: 'form'
    },

    // Navigation
    {
      regex: /<nav[^>]*className="([^"]*)"[^>]*>[\s\S]*?<\/nav>/gi,
      type: 'nav'
    },
  ];

  for (const { regex, type } of patterns) {
    let match;
    // Reset regex lastIndex
    regex.lastIndex = 0;

    while ((match = regex.exec(code)) !== null) {
      const classes = match[1] || match[2] || '';
      const classArray = classes.split(/\s+/).filter(Boolean);

      // Evitar duplicados basados en código similar
      const codeSnippet = match[0].slice(0, 100);
      if (!components.some(c => c.code.slice(0, 100) === codeSnippet)) {
        components.push({
          name: generateComponentName(type, classes),
          code: match[0],
          classes: classArray,
          type,
          isNew: false,
          file: fileName
        });
      }
    }
  }

  return components;
}

/**
 * Genera un nombre descriptivo para el componente
 */
function generateComponentName(type: string, classes: string): string {
  const variants: Record<string, string> = {
    'bg-primary': 'Primary',
    'bg-secondary': 'Secondary',
    'bg-destructive': 'Destructive',
    'bg-muted': 'Muted',
    'bg-accent': 'Accent',
    'variant-outline': 'Outline',
    'variant-ghost': 'Ghost',
    'variant-link': 'Link',
    'bg-green': 'Success',
    'bg-red': 'Error',
    'bg-yellow': 'Warning',
    'bg-blue': 'Info',
    'border-l-4': 'Bordered',
    'rounded-full': 'Pill',
    'rounded-lg': 'Rounded',
    'shadow-lg': 'Elevated',
    'fixed': 'Fixed',
    'sticky': 'Sticky',
  };

  const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);

  for (const [cls, name] of Object.entries(variants)) {
    if (classes.includes(cls)) {
      return `${name} ${typeCapitalized}`;
    }
  }

  return `Custom ${typeCapitalized}`;
}

/**
 * Detecta violaciones de estilo
 */
export function detectStyleViolations(code: string): StyleViolation[] {
  const violations: StyleViolation[] = [];

  // 1. Colores HEX hardcodeados (ignorar en comentarios y strings de config)
  const hexRegex = /(?<!\/\/.*)(?<!\/\*[\s\S]*?)#[0-9a-fA-F]{3,6}(?=["'\s,;\)])/g;
  let match: RegExpExecArray | null;
  while ((match = hexRegex.exec(code)) !== null) {
    // Ignorar si está en un archivo de config o comentario
    if (!isInComment(code, match.index)) {
      violations.push({
        type: 'hardcoded-color',
        code: match[0],
        suggestion: 'Usa variables CSS: bg-primary, text-foreground, border-border, etc.'
      });
    }
  }

  // 2. Colores RGB/RGBA hardcodeados
  const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi;
  while ((match = rgbRegex.exec(code)) !== null) {
    if (!isInComment(code, match.index)) {
      violations.push({
        type: 'hardcoded-color',
        code: match[0],
        suggestion: 'Usa variables CSS del tema en lugar de valores RGB'
      });
    }
  }

  // 3. Inline styles
  const inlineRegex = /style=\{\{([^}]+)\}\}/g;
  while ((match = inlineRegex.exec(code)) !== null) {
    violations.push({
      type: 'inline-style',
      code: `style={{${match[1].slice(0, 50)}...}}`,
      suggestion: 'Usa clases de Tailwind en className'
    });
  }

  // 4. Valores arbitrarios de Tailwind
  const arbitraryRegex = /(?:bg|text|border|p|m|w|h|top|left|right|bottom|gap|space)-\[[^\]]+\]/g;
  let arbMatch: RegExpExecArray | null;
  while ((arbMatch = arbitraryRegex.exec(code)) !== null) {
    // Permitir algunas excepciones comunes
    const exceptions = ['w-[', 'h-[', 'max-w-[', 'min-h-['];
    const isException = exceptions.some(e => arbMatch![0].startsWith(e));

    if (!isException) {
      violations.push({
        type: 'arbitrary-value',
        code: arbMatch[0],
        suggestion: 'Usa valores del Design System (spacing, colors del tema)'
      });
    }
  }

  // 5. Colores directos de Tailwind (no semánticos)
  const directColorRegex = /(?:bg|text|border|ring|outline)-(?:red|blue|green|yellow|orange|purple|pink|indigo|teal|cyan|lime|emerald|amber|rose|fuchsia|violet|sky)-\d{2,3}/g;
  while ((match = directColorRegex.exec(code)) !== null) {
    violations.push({
      type: 'direct-color',
      code: match[0],
      suggestion: 'Usa colores semánticos: bg-primary, bg-destructive, bg-muted, text-foreground, etc.'
    });
  }

  // 6. Magic numbers en padding/margin (valores no estándar)
  const magicNumberRegex = /(?:p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr)-(?:1\.5|2\.5|3\.5|7|9|11|13|14|15|17|18|19|21|22|23|25|26|27|28|29|30)/g;
  while ((match = magicNumberRegex.exec(code)) !== null) {
    violations.push({
      type: 'magic-number',
      code: match[0],
      suggestion: 'Usa valores estándar de spacing: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24'
    });
  }

  return violations;
}

/**
 * Verifica si una posición está dentro de un comentario
 */
function isInComment(code: string, position: number): boolean {
  const beforePosition = code.slice(0, position);

  // Verificar comentario de línea
  const lastNewLine = beforePosition.lastIndexOf('\n');
  const currentLine = beforePosition.slice(lastNewLine + 1);
  if (currentLine.includes('//')) return true;

  // Verificar comentario de bloque
  const lastBlockStart = beforePosition.lastIndexOf('/*');
  const lastBlockEnd = beforePosition.lastIndexOf('*/');
  if (lastBlockStart > lastBlockEnd) return true;

  return false;
}

/**
 * Compara con library existente y marca nuevos
 */
export function markNewComponents(
  components: DetectedComponent[],
  libraryContent: string
): DetectedComponent[] {
  const normalizedLibrary = libraryContent.toLowerCase();

  return components.map(comp => {
    // Considerar nuevo si:
    // 1. El nombre no existe en la library
    // 2. El código (primeros 50 chars) no existe
    const nameExists = normalizedLibrary.includes(comp.name.toLowerCase());
    const codeExists = normalizedLibrary.includes(
      comp.code.slice(0, 50).toLowerCase().replace(/\s+/g, ' ')
    );

    return {
      ...comp,
      isNew: !nameExists && !codeExists
    };
  });
}

/**
 * Extrae todas las clases únicas de los componentes
 */
export function extractUniqueClasses(components: DetectedComponent[]): string[] {
  const allClasses = new Set<string>();

  for (const comp of components) {
    for (const cls of comp.classes) {
      allClasses.add(cls);
    }
  }

  return Array.from(allClasses).sort();
}

/**
 * Genera markdown para componentes nuevos
 */
export function generateMarkdownForNewComponents(components: DetectedComponent[]): string {
  const newOnes = components.filter(c => c.isNew);
  if (newOnes.length === 0) return '';

  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let md = `\n\n---\n\n## Auto-detectados (${date})\n\n`;
  md += `> Componentes detectados automáticamente durante el desarrollo.\n\n`;

  // Agrupar por tipo
  const byType = new Map<string, DetectedComponent[]>();
  for (const comp of newOnes) {
    const type = comp.type;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(comp);
  }

  for (const [type, comps] of byType) {
    md += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;

    for (const comp of comps) {
      md += `#### ${comp.name}\n`;
      if (comp.file) {
        md += `*Detectado en: ${comp.file}*\n`;
      }
      md += `\n\`\`\`tsx\n${formatCode(comp.code)}\n\`\`\`\n\n`;

      if (comp.classes.length > 0) {
        md += `**Clases:** \`${comp.classes.slice(0, 10).join(' ')}\`${comp.classes.length > 10 ? ' ...' : ''}\n\n`;
      }
    }
  }

  return md;
}

/**
 * Formatea código para mejor legibilidad
 */
function formatCode(code: string): string {
  // Limitar longitud
  if (code.length > 500) {
    code = code.slice(0, 500) + '\n// ... (truncado)';
  }

  // Intentar formatear básico
  return code
    .replace(/></g, '>\n<')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera un reporte de violaciones
 */
export function generateViolationsReport(violations: StyleViolation[]): string {
  if (violations.length === 0) return '';

  let report = `\n### Violaciones de Estilo Detectadas\n\n`;
  report += `| Tipo | Código | Sugerencia |\n`;
  report += `|------|--------|------------|\n`;

  for (const v of violations.slice(0, 20)) {
    const code = v.code.slice(0, 30).replace(/\|/g, '\\|');
    const suggestion = v.suggestion.slice(0, 50).replace(/\|/g, '\\|');
    report += `| ${v.type} | \`${code}\` | ${suggestion} |\n`;
  }

  if (violations.length > 20) {
    report += `\n*...y ${violations.length - 20} más*\n`;
  }

  return report;
}
