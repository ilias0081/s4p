export interface UsersTable {
  id: bigint;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface Database {
  users: UsersTable;
}