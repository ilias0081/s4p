import { z } from 'zod';

import type { Integration } from './Integration.js';
import { codedError } from './utils.js';

export type AppMethodType = 'trigger' | 'action_in_app';

export interface AppMethod {
  types: readonly AppMethodType[];
  method: string;
  ui_name: string;
  description: string;
}

export type AppMethodDefinition = AppMethod & {
  inputSchema: z.ZodObject;
  invoke: (input: unknown) => Promise<unknown>;
};

// Bind a typed handler to its schema once; callers always pass through validation.
export function defineAppMethod<TSchema extends z.ZodObject, TResult>(
  definition: AppMethod & {
    inputSchema: TSchema;
    handler: (input: z.output<TSchema>) => Promise<TResult>;
  },
): AppMethodDefinition {
  const { handler, ...metadata } = definition;
  return {
    ...metadata,
    invoke: async (input) => handler(definition.inputSchema.parse(input)),
  };
}

export abstract class App {
  // Integration loading stays outside the constructor; discovery needs no API calls.
  constructor(protected readonly integration: Integration) {}

  protected abstract readonly methods: readonly AppMethodDefinition[];

  getAppMethods(type?: AppMethodType): AppMethod[] {
    return this.methods
      .filter((definition) => !type || definition.types.includes(type))
      .map(({ types, method, ui_name, description }) => ({ types, method, ui_name, description }));
  }

  // JSON Schema is serializable and describes fields, required inputs, and defaults.
  getMethodInputSchema(method: string) {
    return z.toJSONSchema(this.getMethod(method).inputSchema, { io: 'input' });
  }

  validateMethodInput(method: string, input: unknown): Record<string, unknown> {
    return this.getMethod(method).inputSchema.parse(input);
  }

  async executeMethod(method: string, input: unknown): Promise<unknown> {
    return this.getMethod(method).invoke(input);
  }

  private getMethod(method: string): AppMethodDefinition {
    const definition = this.methods.find((candidate) => candidate.method === method);
    if (!definition) {
      throw codedError('APP_METHOD_NOT_FOUND', `Unknown app method: ${method}`);
    }
    return definition;
  }
}
