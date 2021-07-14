import { PartialTypes } from 'discord.js';
import { LoggerConfig } from './logger';

export interface Config {
  ServerConfig: ServerConfig;
  DatabaseConfig: DatabaseConfig;
  BotConfig: BotConfig;
  LoggerConfig?: LoggerConfig;
}

export interface BotConfig {
  token: string;
  prefix: string;
  partials?: PartialTypes[];
}

export interface DatabaseConfig {
  development?: DatabaseEnvironmentConfig;
  test?: DatabaseEnvironmentConfig;
  production?: DatabaseEnvironmentConfig;
}

export interface DatabaseEnvironmentConfig {
  client: string;
  connection: DatabaseConnectionConfig;
  pool?: DatabasePoolConfig;
  migrations?: DatabaseMigrationsConfig;
}

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  options?: DatabaseConnectionOptionsConfig;
}

export interface DatabaseConnectionOptionsConfig {
  enableArithAbort?: boolean;
}

export interface DatabasePoolConfig {
  min?: number;
  max?: number;
}

export interface DatabaseMigrationsConfig {
  tableName?: string;
}

export interface ServerConfig {
  port: number;
}
