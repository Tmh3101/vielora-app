export const KNOWLEDGE_REQUEST_MODE = {
  MANUAL: "manual",
  URL: "url",
  FILE: "file",
} as const;

export type KnowledgeRequestMode =
  (typeof KNOWLEDGE_REQUEST_MODE)[keyof typeof KNOWLEDGE_REQUEST_MODE];
