import { IResolverObject } from 'graphql-tools';
import { Model } from '../dataModel';

export interface Hook {
  // create
  wrapCreate?: (data, createOperation: (data: Record<string, any>) => Promise<any>) => Promise<any>;

  // update
  wrapUpdate?: (
    where: any,
    data: Record<string, any>,
    updateOperation: (where: any, data: Record<string, any>) => Promise<any>) => Promise<any>;

  // delete
  wrapDelete?: (where: any, destroyOperation: (where: any) => Promise<any>) => Promise<any>;

  // query
  resolveFields?: IResolverObject;
}
