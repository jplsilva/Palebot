export interface LoggerConfig {
  level?: 'error' | 'warn' | 'info' | 'debug';
  colorize?: boolean;
  timestampFormat?: string;
  consoleLogging?: boolean;
  logFile?: string;
}
