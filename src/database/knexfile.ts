import { Knex } from 'knex';
import ConfigJson from '../config.json';

const knexConfig: Knex.Config = ConfigJson.DatabaseConfig.development;
export default knexConfig;
