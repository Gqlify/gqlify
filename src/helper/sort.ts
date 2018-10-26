import { orderBy } from 'lodash';

export const sort = (rows: any[], field: string, order: 1 | -1) => {
  const orderValue = order > 0 ? 'asc' : 'desc';
  return orderBy(rows, [field], [orderValue]);
};
