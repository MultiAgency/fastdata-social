export interface BorshFieldType {
  struct?: Record<string, unknown>;
  array?: { type: string };
  option?: unknown;
  enum?: unknown[];
}

export interface BorshSchema {
  struct?: Record<string, string | BorshFieldType>;
  enum?: Array<{ struct: Record<string, unknown> }>;
}

export type BorshSchemaDefinition = Record<string, BorshSchema>;
