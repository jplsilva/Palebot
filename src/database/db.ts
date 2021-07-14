import { Knex, knex } from 'knex';
import { DatabaseEnvironmentConfig } from '../interfaces/config';

// Wrapper for the chosen database connector
export interface DatabaseWrapper extends Knex {}

export function databaseWrapper(
  config: DatabaseEnvironmentConfig,
): DatabaseWrapper {
  return knex(config);
}
