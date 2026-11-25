import { createLogger, format, transports } from 'winston';

// V8 otherwise captures only ten frames, before Winston can filter dependencies.
Error.stackTraceLimit = Infinity;

const filterDependencyFrames = format((info) => {
  if (typeof info.stack === 'string') {
    info.stack = info.stack.split('\n')
      .filter((line) => !(/^\s*at\s/.test(line) && /[\\/]node_modules[\\/]/.test(line)))
      .join('\n');
  }
  return info;
});

export function createErrorLogger(filename = './logs/error.log') {
  return createLogger({
    level: 'error',
    format: format.combine(
      format.errors({ stack: true }),
      filterDependencyFrames(),
      format.timestamp(),
      format.json(),
    ),
    transports: [new transports.File({ filename, level: 'error' })],
  });
}

export const logger = createErrorLogger();
