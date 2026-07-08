function readString(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumber(name: string, fallback?: number) {
  const rawValue = process.env[name] ?? (fallback === undefined ? undefined : String(fallback));

  if (!rawValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const parsedValue = Number(rawValue);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsedValue;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'production',
  port: readNumber('PORT', 3001),
  dbHost: readString('DB_HOST'),
  dbPort: readNumber('DB_PORT', 5432),
  dbName: readString('DB_NAME'),
  dbUser: readString('DB_USER'),
  dbPassword: readString('DB_PASSWORD')
};