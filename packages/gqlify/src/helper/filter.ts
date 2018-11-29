import { get, forEach } from 'lodash';
import { eq, gt, gte, lt, lte, placeholder, filter as fpFilter, flow } from 'lodash/fp';
import { Operator, Where } from '../dataSource/interface';

const createFilterFromOperator = (value, op) => {
  switch (op) {
    case Operator.eq:
      return eq(value);

    case Operator.gt:
      return gt(placeholder, value);

    case Operator.gte:
      return gte(placeholder, value);

    case Operator.lt:
      return lt(placeholder, value);

    case Operator.lte:
      return lte(placeholder, value);
  }
};

const iterateWhere = (where: Where, callback: (field: string, op: Operator, value: any) => void) => {
  forEach(where, (opWithValue, field) => {
    forEach(opWithValue, (value, op: Operator) => {
      callback(field, op, value);
    });
  });
};

export const createFilter = (where: Where) => {
  const funcs = [];
  iterateWhere(where, (field, op, value) => {
    const opFilter = createFilterFromOperator(value, op);
    funcs.push(row => opFilter(get(row, field)));
  });
  return fpFilter<any[]>(flow(funcs));
};

export const filter = (rows: any[], where: Where) => {
  const composedFilter = createFilter(where);
  return composedFilter(rows);
};
