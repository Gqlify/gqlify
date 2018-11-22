
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

export type Where = Record<string, Record<string /** Operator */, any>>;

export interface OrderBy {
  field: string;
  value: 1 | -1;
}

export interface ListFindQuery {
  pagination?: Pagination;
  where?: Where;
  orderBy?: OrderBy;
}

export interface ListReadable {
  find(query?: ListFindQuery): Promise<PaginatedResponse>;

  findOne({
    where,
  }: {
    where: Where,
  }): Promise<any>;

  findOneById(id: string): Promise<any>;
}

export interface ListMutable {
  create(payload: any): Promise<any>;
  update(where: Where, payload: any): Promise<any>;
  delete(where: Where): Promise<any>;
}

export interface ToOneRelation {
  findOneByRelation(foreignKey: string, foreignId: string): Promise<any>;
}

// todo: support embed reference
export interface ToManyRelationEmbedRef {
  serializeManyRelation?(ids: string[]): any;
  supportEmbedRef?(): boolean;
  findOneFromManyRelation(foreignKey: string, foreignId: string): Promise<any>;
}

export interface ToManyRelation {
  findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]>;
}

export interface RelationReadable {
  findManyByRelation(key: string, id: string): Promise<any[]>;
}

export interface RelationMutable {
  addOneToMany(data: any, key: string, id: string): Promise<any>;
  removeOneToMany(data: any, key: string, id: string): Promise<any>;
  setManyToOne(data: any, key: string, id: string): Promise<any>;
  unsetManyToOne(data: any, key: string): Promise<any>;
  addManyToMany(data: any, key: string, id: string): Promise<any>;
  removeManyToMany(data: any, key: string, id: string): Promise<any>;
}

export type DataSource = ListReadable & ListMutable & ToOneRelation & ToManyRelation & ToManyRelationEmbedRef;
