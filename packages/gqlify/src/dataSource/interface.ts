
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
  updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<void>;
}

// todo: support embed reference
export interface OneToManyRelationEmbedRef {
  serializeManyRelation?(ids: string[]): any;
  supportEmbedRef?(): boolean;
  findOneFromManyRelation(foreignKey: string, foreignId: string): Promise<any>;
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
  ToOneRelation &
  OneToManyRelation &
  ManyToManyRelation;
