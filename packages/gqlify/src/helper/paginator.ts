import { isEmpty, isUndefined, first as _first, last as _last, get, isNil } from 'lodash';
import { takeWhile, takeRightWhile, take, takeRight, slice, flow } from 'lodash/fp';
import { Pagination } from '../dataSource/interface';

export const paginate = (rows: any[], pagination?: Pagination):
  {data: any[], total: number, hasNextPage: boolean, hasPreviousPage: boolean} => {
  if (isEmpty(pagination) || isEmpty(rows)) {
    return {
      data: rows,
      total: rows.length,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  const transforms = [];
  // numbered pagination
  if (pagination.perPage && pagination.page) {
    const skip = pagination.perPage * (pagination.page - 1);
    const limit = pagination.perPage;
    if (!isUndefined(skip) && skip > 0) {
      transforms.push(slice(skip));
    }

    if (!isUndefined(limit)) {
      transforms.push(take(limit));
    }

    const totalPages = Math.ceil(rows.length / pagination.perPage);
    return {
      data: flow(transforms)(rows),
      total: rows.length,
      hasNextPage: totalPages > pagination.page,
      hasPreviousPage: pagination.page > 1,
    };
  }

  // cursor pagination
  const { last, first, before, after } = pagination;

  if (!isUndefined(before)) {
    // row.id cast to string in case of mongodb ObjectID()
    transforms.push(takeWhile<any>(row => '' + row.id !== before));
  }

  if (!isUndefined(after)) {
    // row.id cast to string in case of mongodb ObjectID()
    transforms.push(takeRightWhile<any>(row => '' + row.id !== after));
  }

  if (!isUndefined(first)) {
    transforms.push(take(first));
  }

  if (!isUndefined(last)) {
    transforms.push(takeRight(last));
  }
  const data = flow(transforms)(rows);
  const firstRowId = get(_first(rows), 'id');
  const firstFilteredDataId = get(_first(data), 'id');
  const lastRowId = get(_last(rows), 'id');
  const lastFilteredDataId = get(_last(data), 'id');
  return {
    data,
    total: rows.length,
    hasNextPage: (!isNil(lastRowId) && !isNil(lastFilteredDataId) && lastRowId !== lastFilteredDataId),
    hasPreviousPage: (!isNil(firstRowId) && !isNil(firstFilteredDataId) && firstRowId !== firstFilteredDataId),
  };
};
