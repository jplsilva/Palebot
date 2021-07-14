import { DatabaseWrapper } from '../../database/db';
import { LooseObject } from './util';

export function createInsertObject(columns: string[], values: any[]) {
  if (columns.length != values.length) {
    return undefined;
  }

  const insertOjbect: LooseObject = {};
  for (let idx = 0; idx < columns.length; idx++) {
    const column = columns[idx];
    const value = values[idx];
    insertOjbect[column] = value;
  }

  return insertOjbect;
}
