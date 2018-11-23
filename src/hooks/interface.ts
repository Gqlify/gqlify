import { IResolverObject } from 'graphql-tools';
import { Model } from '../dataModel';

export interface Hook {
  // create
  beforeCreate?: (data: Record<string, any>) => Promise<void>;
  transformCreatePayload?: (data: Record<string, any>) => Promise<Record<string, any>>;
  afterCreate?: (data: Record<string, any>) => Promise<void>;

  // update
  beforeUpdate?: (where: any, data: Record<string, any>) => Promise<void>;
  transformUpdatePayload?: (data: Record<string, any>) => Promise<Record<string, any>>;
  afterUpdate?: (where: any, data: Record<string, any>) => Promise<void>;

  // delete
  beforeDelete?: (where: any) => Promise<void>;
  afterDelete?: (where: any) => Promise<void>;

  // query
  resolveFields?: IResolverObject;
}
