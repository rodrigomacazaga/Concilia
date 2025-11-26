// Tipos para el sistema de Memory Bank Jerárquico

export interface MemoryBankConfig {
  service_name: string;
  version: string;
  description: string;
  port?: number;
  technology?: string;
  sync_to_general: Record<string, string>;  // local file → general section
  dependencies?: ServiceDependency[];
  last_sync?: string;
  auto_sync: boolean;
  status?: 'active' | 'development' | 'deprecated' | 'planned';
}

export interface ServiceDependency {
  service: string;
  min_version: string;
  endpoints_used: string[];
  reason: string;
}

export interface MemoryBankFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  size: number;
}

export interface LocalMemoryBank {
  serviceName: string;
  servicePath: string;
  config: MemoryBankConfig | null;
  files: MemoryBankFile[];
  exists: boolean;
}

export interface GeneralMemoryBank {
  projectName: string;
  projectPath: string;
  files: MemoryBankFile[];
  services: ServiceSummary[];
  exists: boolean;
}

export interface ServiceSummary {
  name: string;
  version: string;
  description: string;
  port?: number;
  technology?: string;
  endpoints_count: number;
  tables_count: number;
  status: 'active' | 'development' | 'deprecated' | 'planned';
  last_sync?: string;
  has_local_memory_bank: boolean;
}

export interface SyncResult {
  success: boolean;
  service: string;
  filesUpdated: string[];
  generalFilesUpdated: string[];
  errors: string[];
  timestamp: string;
}

export interface SyncStatus {
  service: string;
  inSync: boolean;
  localVersion: string;
  generalVersion: string;
  lastSync?: string;
  pendingChanges: string[];
}

export interface InitMemoryBankRequest {
  projectId: string;
  service?: string;
  config?: Partial<MemoryBankConfig>;
}

export interface UpdateMemoryBankFileRequest {
  fileName: string;
  content: string;
  triggerSync?: boolean;
}

export interface SyncRequest {
  projectId: string;
  service?: string;
  direction?: 'local-to-general' | 'general-to-local';
}
