/**
 * Wizard Questions Configuration
 * Preguntas para generar el Memory Bank inicial de un proyecto
 */

export interface WizardQuestion {
  id: string;
  category: 'basic' | 'architecture' | 'tech' | 'design' | 'business' | 'team';
  question: string;
  placeholder?: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  required?: boolean;
  memoryBankFile: string; // Archivo del Memory Bank donde va esta info
  memoryBankSection: string; // Sección dentro del archivo
  importance: 'critical' | 'high' | 'medium' | 'low';
  followUp?: string; // ID de pregunta que aparece si esta se responde
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: WizardQuestion[];
  optional?: boolean;
}

// Categorías de preguntas
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Información Básica',
    description: 'Cuéntanos sobre tu proyecto',
    icon: '📋',
    questions: [
      {
        id: 'project_purpose',
        category: 'basic',
        question: '¿Cuál es el propósito principal del proyecto?',
        placeholder: 'Ej: Una plataforma de e-commerce para vender productos artesanales...',
        type: 'textarea',
        required: true,
        memoryBankFile: '01-PROJECT-OVERVIEW.md',
        memoryBankSection: 'Purpose',
        importance: 'critical'
      },
      {
        id: 'target_users',
        category: 'basic',
        question: '¿Quiénes son los usuarios principales?',
        placeholder: 'Ej: Pequeños comerciantes que quieren vender online...',
        type: 'textarea',
        memoryBankFile: '01-PROJECT-OVERVIEW.md',
        memoryBankSection: 'Target Users',
        importance: 'high'
      },
      {
        id: 'key_features',
        category: 'basic',
        question: '¿Cuáles son las características clave del sistema?',
        placeholder: 'Ej: Carrito de compras, pagos con Stripe, gestión de inventario...',
        type: 'textarea',
        memoryBankFile: '01-PROJECT-OVERVIEW.md',
        memoryBankSection: 'Key Features',
        importance: 'high'
      },
      {
        id: 'project_stage',
        category: 'basic',
        question: '¿En qué etapa está el proyecto?',
        type: 'select',
        options: ['Idea/Concepto', 'Diseño', 'Desarrollo inicial', 'MVP', 'Producción', 'Mantenimiento'],
        memoryBankFile: '01-PROJECT-OVERVIEW.md',
        memoryBankSection: 'Current Stage',
        importance: 'medium'
      }
    ]
  },
  {
    id: 'architecture',
    title: 'Arquitectura',
    description: 'Define la estructura técnica',
    icon: '🏗️',
    optional: true,
    questions: [
      {
        id: 'architecture_style',
        category: 'architecture',
        question: '¿Qué estilo de arquitectura usas o planeas usar?',
        type: 'multiselect',
        options: ['Monolito', 'Microservicios', 'Serverless', 'Event-Driven', 'Hexagonal', 'Clean Architecture', 'MVC', 'MVVM'],
        memoryBankFile: '02-ARCHITECTURE.md',
        memoryBankSection: 'Architecture Style',
        importance: 'high'
      },
      {
        id: 'deployment_target',
        category: 'architecture',
        question: '¿Dónde se desplegará la aplicación?',
        type: 'multiselect',
        options: ['Vercel', 'AWS', 'Google Cloud', 'Azure', 'Docker/Kubernetes', 'VPS', 'On-premise', 'No definido'],
        memoryBankFile: '02-ARCHITECTURE.md',
        memoryBankSection: 'Deployment',
        importance: 'medium'
      },
      {
        id: 'data_storage',
        category: 'architecture',
        question: '¿Qué bases de datos utilizas?',
        type: 'multiselect',
        options: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Supabase', 'Firebase', 'PlanetScale', 'Ninguna aún'],
        memoryBankFile: '02-ARCHITECTURE.md',
        memoryBankSection: 'Data Storage',
        importance: 'high'
      },
      {
        id: 'external_services',
        category: 'architecture',
        question: '¿Qué servicios externos integras?',
        placeholder: 'Ej: Stripe para pagos, SendGrid para emails, Cloudinary para imágenes...',
        type: 'textarea',
        memoryBankFile: '02-ARCHITECTURE.md',
        memoryBankSection: 'External Services',
        importance: 'medium'
      }
    ]
  },
  {
    id: 'tech',
    title: 'Stack Tecnológico',
    description: 'Detalla las tecnologías usadas',
    icon: '⚙️',
    optional: true,
    questions: [
      {
        id: 'frontend_framework',
        category: 'tech',
        question: '¿Qué framework de frontend usas?',
        type: 'select',
        options: ['Next.js', 'React', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'Astro', 'Otro'],
        memoryBankFile: '03-TECH-STACK.md',
        memoryBankSection: 'Frontend',
        importance: 'high'
      },
      {
        id: 'backend_tech',
        category: 'tech',
        question: '¿Qué tecnología de backend usas?',
        type: 'multiselect',
        options: ['Next.js API Routes', 'Node.js/Express', 'Python/FastAPI', 'Go', 'Java/Spring', 'Ruby/Rails', '.NET', 'Otro'],
        memoryBankFile: '03-TECH-STACK.md',
        memoryBankSection: 'Backend',
        importance: 'high'
      },
      {
        id: 'styling_approach',
        category: 'tech',
        question: '¿Cómo manejas los estilos?',
        type: 'multiselect',
        options: ['Tailwind CSS', 'CSS Modules', 'Styled Components', 'Sass/SCSS', 'shadcn/ui', 'Material UI', 'Chakra UI', 'CSS vanilla'],
        memoryBankFile: '03-TECH-STACK.md',
        memoryBankSection: 'Styling',
        importance: 'medium'
      },
      {
        id: 'state_management',
        category: 'tech',
        question: '¿Cómo manejas el estado?',
        type: 'multiselect',
        options: ['React Context', 'Redux', 'Zustand', 'Jotai', 'Recoil', 'MobX', 'React Query/TanStack', 'SWR', 'No aplica'],
        memoryBankFile: '03-TECH-STACK.md',
        memoryBankSection: 'State Management',
        importance: 'medium'
      },
      {
        id: 'testing_tools',
        category: 'tech',
        question: '¿Qué herramientas de testing usas?',
        type: 'multiselect',
        options: ['Jest', 'Vitest', 'Cypress', 'Playwright', 'Testing Library', 'Mocha', 'Ninguna'],
        memoryBankFile: '03-TECH-STACK.md',
        memoryBankSection: 'Testing',
        importance: 'medium'
      }
    ]
  },
  {
    id: 'design',
    title: 'Diseño',
    description: 'Define el sistema de diseño',
    icon: '🎨',
    optional: true,
    questions: [
      {
        id: 'design_system',
        category: 'design',
        question: '¿Tienes un sistema de diseño definido?',
        type: 'select',
        options: ['Sí, documentado', 'Sí, pero informal', 'En proceso', 'No'],
        memoryBankFile: '10-DESIGN-SYSTEM.md',
        memoryBankSection: 'Status',
        importance: 'high'
      },
      {
        id: 'color_scheme',
        category: 'design',
        question: '¿Cuál es el esquema de colores principal?',
        placeholder: 'Ej: Azul primario (#3B82F6), gris para texto, fondo claro...',
        type: 'textarea',
        memoryBankFile: '10-DESIGN-SYSTEM.md',
        memoryBankSection: 'Colors',
        importance: 'medium'
      },
      {
        id: 'typography',
        category: 'design',
        question: '¿Qué tipografías usas?',
        placeholder: 'Ej: Inter para UI, Playfair Display para títulos...',
        type: 'text',
        memoryBankFile: '10-DESIGN-SYSTEM.md',
        memoryBankSection: 'Typography',
        importance: 'low'
      },
      {
        id: 'ui_components',
        category: 'design',
        question: '¿Qué componentes UI principales tienes?',
        placeholder: 'Ej: Button, Card, Modal, Navbar, Sidebar...',
        type: 'textarea',
        memoryBankFile: '11-COMPONENT-LIBRARY.md',
        memoryBankSection: 'Components',
        importance: 'medium'
      }
    ]
  },
  {
    id: 'business',
    title: 'Contexto de Negocio',
    description: 'Reglas y lógica de negocio',
    icon: '💼',
    optional: true,
    questions: [
      {
        id: 'business_rules',
        category: 'business',
        question: '¿Cuáles son las reglas de negocio más importantes?',
        placeholder: 'Ej: Los usuarios premium tienen descuento del 20%, máximo 5 productos en carrito...',
        type: 'textarea',
        memoryBankFile: '04-BUSINESS-LOGIC.md',
        memoryBankSection: 'Business Rules',
        importance: 'high'
      },
      {
        id: 'user_roles',
        category: 'business',
        question: '¿Qué roles de usuario existen?',
        placeholder: 'Ej: Admin, Vendedor, Cliente, Invitado...',
        type: 'textarea',
        memoryBankFile: '04-BUSINESS-LOGIC.md',
        memoryBankSection: 'User Roles',
        importance: 'high'
      },
      {
        id: 'workflows',
        category: 'business',
        question: '¿Cuáles son los flujos principales del sistema?',
        placeholder: 'Ej: Registro → Verificación email → Completar perfil → Crear tienda...',
        type: 'textarea',
        memoryBankFile: '04-BUSINESS-LOGIC.md',
        memoryBankSection: 'Main Workflows',
        importance: 'medium'
      }
    ]
  },
  {
    id: 'conventions',
    title: 'Convenciones',
    description: 'Estándares y patrones del código',
    icon: '📝',
    optional: true,
    questions: [
      {
        id: 'naming_conventions',
        category: 'team',
        question: '¿Qué convenciones de nomenclatura usas?',
        placeholder: 'Ej: camelCase para variables, PascalCase para componentes, kebab-case para archivos...',
        type: 'textarea',
        memoryBankFile: '05-CODING-STANDARDS.md',
        memoryBankSection: 'Naming Conventions',
        importance: 'medium'
      },
      {
        id: 'file_structure',
        category: 'team',
        question: '¿Cómo organizas los archivos del proyecto?',
        placeholder: 'Ej: Por features (users/, products/) o por tipo (components/, hooks/, utils/)...',
        type: 'textarea',
        memoryBankFile: '05-CODING-STANDARDS.md',
        memoryBankSection: 'File Structure',
        importance: 'medium'
      },
      {
        id: 'patterns_used',
        category: 'team',
        question: '¿Qué patrones de diseño usas frecuentemente?',
        type: 'multiselect',
        options: ['Repository Pattern', 'Factory', 'Singleton', 'Observer', 'Strategy', 'Composition', 'HOCs', 'Custom Hooks', 'Compound Components'],
        memoryBankFile: '05-CODING-STANDARDS.md',
        memoryBankSection: 'Design Patterns',
        importance: 'medium'
      }
    ]
  }
];

// Calcular puntuación de completitud
export function calculateCompleteness(answers: Record<string, string | string[]>): number {
  let totalWeight = 0;
  let answeredWeight = 0;

  const weights = {
    critical: 10,
    high: 5,
    medium: 3,
    low: 1
  };

  for (const step of WIZARD_STEPS) {
    for (const question of step.questions) {
      const weight = weights[question.importance];
      totalWeight += weight;

      const answer = answers[question.id];
      if (answer && (typeof answer === 'string' ? answer.trim() : answer.length > 0)) {
        answeredWeight += weight;
      }
    }
  }

  return Math.round((answeredWeight / totalWeight) * 100);
}

// Obtener todas las preguntas planas
export function getAllQuestions(): WizardQuestion[] {
  return WIZARD_STEPS.flatMap(step => step.questions);
}

// Obtener preguntas críticas
export function getCriticalQuestions(): WizardQuestion[] {
  return getAllQuestions().filter(q => q.importance === 'critical' || q.importance === 'high');
}
