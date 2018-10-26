
export interface Pagination {
  // cursor base
  last: number;
  first: number;
  before: string;
  after: string;

  // number based
  perPage: number;
  page: number;
}

export interface PaginatedResponse {
  data: any[];
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export enum Operator {
  eq = 'eq',
  neq = 'eq',
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
}

export type Where = Record<string, Record<Operator, any>>;

export interface OrderBy {
  field: string;
  value: 1 | -1;
}

export interface ListReadable {
  find({
    pagination,
    where,
    orderBy,
  }: {
    pagination?: Pagination,
    where?: Where,
    orderBy?: OrderBy,
  }): Promise<PaginatedResponse>;

  findOne({
    where,
  }: {
    where: Where,
  }): Promise<any>;
}

export interface ListMutable {
  create(payload: any): Promise<any>;
  update(where: Where, payload: any): Promise<any>;
  delete(where: Where): Promise<any>;
}
