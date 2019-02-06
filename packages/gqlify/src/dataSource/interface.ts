
export interface Pagination {
  // cursor base
  last?: number;
  first?: number;
  before?: string;
  after?: string;

  // number based
  perPage?: number;
  page?: number;
}

type PromiseOrScalar<T> = T | (() => Promise<T>);

export interface PaginatedResponse {
  data: any[];
  // total, hasNextPage and hasPreviousPage might be async request to data-source
  // for example: firebase will not respond filtered data with these information
  total: PromiseOrScalar<number>;
  hasNextPage: PromiseOrScalar<boolean>;
  hasPreviousPage: PromiseOrScalar<boolean>;
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

/**
 * ListMutable
 */

export enum ArrayOperator {
  set = 'set',
  add = 'add',
  remove = 'remove',
}

export interface ArrayOperation {
  fieldName: string;
  value: any;
  operator: ArrayOperator;
}

export interface Mutation {
  getData(): Record<string, any>;
  addField(name: string, value: any): void;
  getArrayOperations(): ArrayOperation[];
}

export interface ListMutable {
  create(mutation: Mutation): Promise<any>;
  update(where: Where, mutation: Mutation): Promise<any>;
  delete(where: Where): Promise<any>;
}

/**
 * Map
 */

export interface MapReadable {
  getMap?(key: string): Promise<Record<string, any>>;
}

export interface MapMutable {
  updateMap?(key: string, mutation: Mutation): Promise<void>;
}

/**
 * Relation
 */

export interface ToOneRelation {
  findOneByRelation(foreignKey: string, foreignId: string): Promise<any>;
  updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<void>;
}

// data-source capable of saving to-many references in a embed list or map
// and serving index to find one or many by embed field
export interface EmbeddableRelation {
  addEmbedIds?(foreignKey: string, ids: string[]): any;
  removeEmbedIds?(foreignKey: string, ids: string[]): any;
  findOneByEmbedId?(foreignKey: string, foreignId: string): Promise<any>;
  findManyByEmbedId?(foreignKey: string, foreignId: string): Promise<any[]>;
}

export interface OneToManyRelation {
  findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]>;
}

export interface ManyToManyRelation {
  // it's source-side data-source's responsibility to get the many relation from source-side
  findManyFromManyRelation(sourceSideName: string, targetSideName: string, sourceSideId: string): Promise<any[]>;
  addIdToManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string): Promise<void>;
  removeIdFromManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string): Promise<void>;
}

export type DataSource =
  ListReadable &
  ListMutable &
  MapReadable &
  MapMutable &
  ToOneRelation &
  OneToManyRelation &
  ManyToManyRelation &
  EmbeddableRelation;
