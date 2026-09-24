import type { Generated } from 'kysely';

// pg returns int8/bigint columns as JS strings by default, not JS bigint
export interface UsersTable {
  id: Generated<string>;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface WorkflowsTable {
  id: Generated<string>;
  user_id: Generated<string>;
  name: string;
}

export interface Database {
  users: UsersTable;
  workflows: WorkflowsTable;
}