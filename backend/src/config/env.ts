function readString(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Expected Docker Compose to inject it from the repo root .env.`
    );
  }

  return value;
}

function readNumber(name: string, fallback?: number) {
  const rawValue = process.env[name] ?? (fallback === undefined ? undefined : String(fallback));

  if (!rawValue) {
    throw new Error(
      `Missing required environment variable: ${name}. Expected Docker Compose to inject it from the repo root .env.`
    );
  }

  const parsedValue = Number(rawValue);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsedValue;
}

const nodeEnv = process.env.NODE_ENV ?? 'production';

export const env = {
  nodeEnv,
  port: readNumber('PORT', 3001),
  sessionSecret: readString(
    'SESSION_SECRET',
    nodeEnv === 'production' ? undefined : 'development-only-session-secret'
  ),
  dbHost: readString('POSTGRES_HOST', 'postgres'),
  dbPort: readNumber('POSTGRES_PORT', 5432),
  dbName: readString('POSTGRES_DB'),
  dbUser: readString('POSTGRES_USER'),
  dbPassword: readString('POSTGRES_PASSWORD')
};