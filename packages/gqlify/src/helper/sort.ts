import { orderBy, isEmpty } from 'lodash';
import { OrderBy } from '../dataSource/interface';

export const sort = (rows: any[], order?: OrderBy) => {
  if (isEmpty(order)) {
    return rows;
  }
  const orderValue = order.value > 0 ? 'asc' : 'desc';
  return orderBy(rows, [order.field], [orderValue]);
};
