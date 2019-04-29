import {IResolverObject} from 'graphql-tools';

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
  neq = 'neq',
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  regex = 'regex',
  near = 'near',
  json = 'json'
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
  find(query?: ListFindQuery, context?: any): Promise<PaginatedResponse>;

  findOne({where}: {where: Where}, context?: any): Promise<any>;

  findOneById(id: string, context?: any): Promise<any>;
}

/**
 * ListMutable
 */

export enum ArrayOperator {
  set = 'set',
  add = 'add',
  remove = 'remove'
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
  create(mutation: Mutation, context?: any): Promise<any>;
  update(where: Where, mutation: Mutation, context?: any): Promise<any>;
  delete(where: Where, context?: any): Promise<any>;
}

/**
 * Map
 */

export interface MapReadable {
  getMap?(): Promise<Record<string, any>>;
}

export interface MapMutable {
  updateMap?(mutation: Mutation): Promise<void>;
}

/**
 * Relation
 */

export interface ToOneRelation {
  findOneByRelation(
    foreignKey: string,
    foreignId: string,
    context: any
  ): Promise<any>;
  updateOneRelation(
    id: string,
    foreignKey: string,
    foreignId: string,
    context: any
  ): Promise<void>;
}

// data-source capable of saving to-many references in a embed list or map
// and serving index to find one or many by embed field
export interface EmbeddableRelation {
  addEmbedIds?(foreignKey: string, ids: string[], context: any): any;
  removeEmbedIds?(foreignKey: string, ids: string[], context: any): any;
  findOneByEmbedId?(
    foreignKey: string,
    foreignId: string,
    context: any
  ): Promise<any>;
  findManyByEmbedId?(
    foreignKey: string,
    foreignId: string,
    context: any
  ): Promise<any[]>;
}

export interface OneToManyRelation {
  findManyFromOneRelation(
    foreignKey: string,
    foreignId: string,
    context: any
  ): Promise<any[]>;
}

export interface ManyToManyRelation {
  // it's source-side data-source's responsibility to get the many relation from source-side
  findManyFromManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string,
    context: any
  ): Promise<any[]>;
  addIdToManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string,
    targetSideId: string,
    context: any
  ): Promise<void>;
  removeIdFromManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string,
    targetSideId: string,
    context: any
  ): Promise<void>;
}

// able to resolve fields and reflect to graphql resolver
export interface FieldResolvable {
  resolveFields?(): IResolverObject;
}

export type DataSource = ListReadable &
  ListMutable &
  MapReadable &
  MapMutable &
  ToOneRelation &
  OneToManyRelation &
  ManyToManyRelation &
  EmbeddableRelation &
  FieldResolvable;
