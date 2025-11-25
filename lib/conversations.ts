import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CONVERSATIONS_DIR = path.join(DATA_DIR, "conversations");

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  projectId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Asegurar que existen los directorios
async function ensureDirectories() {
  await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
}

// Obtener path del archivo de conversación
function getConversationPath(projectId: string, conversationId: string): string {
  return path.join(CONVERSATIONS_DIR, projectId, `${conversationId}.json`);
}

// Listar conversaciones de un proyecto
export async function listConversations(projectId: string): Promise<ConversationSummary[]> {
  await ensureDirectories();

  const projectDir = path.join(CONVERSATIONS_DIR, projectId);

  try {
    await fs.mkdir(projectDir, { recursive: true });
    const files = await fs.readdir(projectDir);
    const conversations: ConversationSummary[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(projectDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const conv: Conversation = JSON.parse(content);
        conversations.push({
          id: conv.id,
          projectId: conv.projectId,
          title: conv.title,
          messageCount: conv.messages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        });
      }
    }

    return conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error("Error listing conversations:", error);
    return [];
  }
}

// Obtener una conversación
export async function getConversation(projectId: string, conversationId: string): Promise<Conversation | null> {
  try {
    const filePath = getConversationPath(projectId, conversationId);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Crear una nueva conversación
export async function createConversation(projectId: string, title?: string): Promise<Conversation> {
  await ensureDirectories();

  const projectDir = path.join(CONVERSATIONS_DIR, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const conversation: Conversation = {
    id,
    projectId,
    title: title || `Conversación ${new Date().toLocaleDateString()}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  const filePath = getConversationPath(projectId, id);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}

// Agregar mensaje a una conversación
export async function addMessage(
  projectId: string,
  conversationId: string,
  message: Omit<Message, "id" | "timestamp">
): Promise<Message> {
  const conversation = await getConversation(projectId, conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const newMessage: Message = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(newMessage);
  conversation.updatedAt = new Date().toISOString();

  // Actualizar título basado en el primer mensaje del usuario
  if (conversation.messages.length === 1 && message.role === "user") {
    conversation.title = message.content.substring(0, 50) + (message.content.length > 50 ? "..." : "");
  }

  const filePath = getConversationPath(projectId, conversationId);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

  return newMessage;
}

// Actualizar el último mensaje (para streaming)
export async function updateLastMessage(
  projectId: string,
  conversationId: string,
  content: string
): Promise<void> {
  const conversation = await getConversation(projectId, conversationId);

  if (!conversation || conversation.messages.length === 0) {
    throw new Error("Conversation not found or empty");
  }

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  lastMessage.content = content;
  conversation.updatedAt = new Date().toISOString();

  const filePath = getConversationPath(projectId, conversationId);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
}

// Eliminar una conversación
export async function deleteConversation(projectId: string, conversationId: string): Promise<boolean> {
  try {
    const filePath = getConversationPath(projectId, conversationId);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// Renombrar una conversación
export async function renameConversation(
  projectId: string,
  conversationId: string,
  newTitle: string
): Promise<Conversation | null> {
  const conversation = await getConversation(projectId, conversationId);

  if (!conversation) {
    return null;
  }

  conversation.title = newTitle;
  conversation.updatedAt = new Date().toISOString();

  const filePath = getConversationPath(projectId, conversationId);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}
