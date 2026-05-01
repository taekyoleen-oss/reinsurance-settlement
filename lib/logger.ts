import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    base: { service: 'reinsurance-settlement' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['*.password', '*.token', '*.secret', '*.key', 'req.headers.authorization'],
      censor: '[REDACTED]',
    },
  },
  isDev
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } })
    : undefined
)

export default logger

export const apiLogger = logger.child({ module: 'api' })
export const dbLogger = logger.child({ module: 'db' })
export const authLogger = logger.child({ module: 'auth' })
