/**
 * Structured Logger
 * 
 * Pino-style structured logger with request ID tracking,
 * secret redaction, and phone number hashing for security.
 * 
 * @module backend/utils/logger
 */

interface LogContext {
  requestId?: string;
  userId?: string;
  phoneNumber?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  [key: string]: any;
}

class StructuredLogger {
  private logLevel: string;
  private enableRequestIds: boolean;

  constructor() {
    this.logLevel = Deno.env.get('LOG_LEVEL') || 'info';
    this.enableRequestIds = Deno.env.get('OBS_ENABLE_REQUEST_IDS') === 'true';
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash sensitive data like phone numbers
   */
  private hashSensitiveData(value: string): string {
    if (!value) return value;
    // Simple hash for demo - in production use crypto.subtle.digest
    const hash = btoa(value).slice(0, 8);
    return `***${hash}***`;
  }

  /**
   * Redact sensitive information from objects
   */
  private redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const redacted = { ...obj };
    
    // Redact common secret patterns
    const secretKeys = ['token', 'key', 'secret', 'password', 'auth', 'authorization'];
    const sensitiveKeys = ['phone', 'phoneNumber', 'mobile', 'contact'];
    
    for (const key in redacted) {
      const lowerKey = key.toLowerCase();
      
      if (secretKeys.some(secret => lowerKey.includes(secret))) {
        redacted[key] = '***REDACTED***';
      } else if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        redacted[key] = this.hashSensitiveData(redacted[key]);
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSecrets(redacted[key]);
      }
    }
    
    return redacted;
  }

  /**
   * Format log entry
   */
  private formatLogEntry(level: string, message: string, context: LogContext = {}): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.redactSecrets(context)
    };

    if (this.enableRequestIds && context.requestId) {
      entry.requestId = context.requestId;
    }

    return entry;
  }

  /**
   * Log at info level
   */
  info(message: string, context: LogContext = {}) {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify(this.formatLogEntry('info', message, context)));
    }
  }

  /**
   * Log at warn level
   */
  warn(message: string, context: LogContext = {}) {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.formatLogEntry('warn', message, context)));
    }
  }

  /**
   * Log at error level
   */
  error(message: string, context: LogContext = {}) {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.formatLogEntry('error', message, context)));
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, context: LogContext = {}) {
    if (this.shouldLog('debug')) {
      console.debug(JSON.stringify(this.formatLogEntry('debug', message, context)));
    }
  }

  /**
   * Check if should log at given level
   */
  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex <= currentLevelIndex;
  }

  /**
   * Log request start
   */
  logRequestStart(requestId: string, method: string, endpoint: string, context: LogContext = {}) {
    this.info('Request started', {
      requestId,
      method,
      endpoint,
      ...context
    });
  }

  /**
   * Log request end
   */
  logRequestEnd(requestId: string, method: string, endpoint: string, statusCode: number, duration: number, context: LogContext = {}) {
    this.info('Request completed', {
      requestId,
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    });
  }

  /**
   * Log error with context
   */
  logError(error: Error, context: LogContext = {}) {
    this.error('Error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    });
  }

  /**
   * Log business logic events
   */
  logBusinessEvent(event: string, context: LogContext = {}) {
    this.info(`Business event: ${event}`, context);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, context: LogContext = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...context
    });
  }
}

// Export singleton instance
export const logger = new StructuredLogger();

// Export types
export type { LogContext, LogEntry };
