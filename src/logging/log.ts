// TODO: Refactor entire file

import winston from 'winston';
import { LoggerConfig } from '../interfaces/logger';

const _defaultLevelOptions = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
  },
};

const _devBaseConfig: LoggerConfig = {
  level: _getDefaultLevel(),
  colorize: true,
  timestampFormat: 'DD/MM/YYYY HH:mm:ss:ms',
  consoleLogging: true,
  logFile: 'logs/main-dev.log',
};
const _prdBaseConfig: LoggerConfig = {
  level: _getDefaultLevel(),
  colorize: false,
  timestampFormat: 'DD/MM/YYYY HH:mm:ss:ms',
  consoleLogging: false,
  logFile: 'logs/main.log',
};

let _customBaseConfig: LoggerConfig | undefined;

function _isDevelopment() {
  const env = process.env.NODE_ENV || 'prd';
  return env === 'dev';
}

function _getDefaultLevel() {
  return _isDevelopment() ? 'debug' : 'info';
}

function _getBaseConfig() {
  return _customBaseConfig ? _customBaseConfig : _isDevelopment() ? _devBaseConfig : _prdBaseConfig;
}

export function setBaseLoggerConfig(config?: LoggerConfig) {
  if (!config) return;

  _customBaseConfig = _isDevelopment() ? _devBaseConfig : _prdBaseConfig;
  if (config.level != undefined) _customBaseConfig.level = config.level;
  if (config.colorize != undefined) _customBaseConfig.colorize = config.colorize;
  if (config.timestampFormat != undefined) _customBaseConfig.timestampFormat = config.timestampFormat;
  if (config.consoleLogging != undefined) _customBaseConfig.consoleLogging = config.consoleLogging;
  if (config.logFile != undefined) _customBaseConfig.logFile = config.logFile;

  return _customBaseConfig;
}

export function createLogger(name: string) {
  const baseConfig = _getBaseConfig();
  let format = null;
  if (baseConfig.colorize) {
    format = winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp({ format: baseConfig.timestampFormat }),
      winston.format.colorize({
        level: true,
        colors: _defaultLevelOptions.colors,
      }),
      winston.format.printf((info) => `${info.timestamp} - [${info.level}] [${name}]: ${info.message}`),
    );
  } else {
    format = winston.format.combine(
      winston.format.splat(),
      winston.format.timestamp({ format: baseConfig.timestampFormat }),
      winston.format.printf((info) => `${info.timestamp} - [${info.level}] [${name}]: ${info.message}`),
    );
  }

  let transports: winston.transport[] = [
    new winston.transports.File({
      filename: `${__dirname}/../${baseConfig.logFile}`,
    }),
  ];

  if (baseConfig.consoleLogging) {
    transports.push(new winston.transports.Console());
  }

  return winston.createLogger({
    level: baseConfig.level,
    levels: _defaultLevelOptions.levels,
    format,
    transports,
  });
}
