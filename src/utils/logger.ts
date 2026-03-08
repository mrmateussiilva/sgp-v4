/**
 * Sistema de logging centralizado
 * Remove logs em produção para melhor performance
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private shouldLog(_level: LogLevel): boolean {
    // Em produção não exibir nada no console do navegador
    if (!isDev) return false;
    return true;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatMessage('debug', message, args.length > 0 ? args : undefined);
    console.debug(`[DEBUG] ${entry.timestamp}`, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatMessage('info', message, args.length > 0 ? args : undefined);
    console.info(`[INFO] ${entry.timestamp}`, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatMessage('warn', message, args.length > 0 ? args : undefined);
    console.warn(`[WARN] ${entry.timestamp}`, message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatMessage('error', message, { error, args });
    console.error(`[ERROR] ${entry.timestamp}`, message, error, ...args);
  }

  /**
   * Log específico para operações de API
   */
  api(method: string, url: string, data?: unknown): void {
    if (!isDev) return;
    this.debug(`API ${method.toUpperCase()}`, url, data);
  }

  /**
   * Log específico para operações de performance
   */
  performance(label: string, duration: number): void {
    if (!isDev) return;
    this.debug(`Performance: ${label}`, `${duration.toFixed(2)}ms`);
  }
}

export const logger = new Logger();

// Exportar funções individuais para facilitar uso
export const { debug, info, warn, error, api, performance } = logger;

