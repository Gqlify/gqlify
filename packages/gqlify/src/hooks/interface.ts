import { IResolverObject } from 'graphql-tools';
export interface CreateContext {
  data: any;
  response: any;
  graphqlContext: any;
}

export interface UpdateContext {
  where: any;
  data: Record<string, any>;
  response: any;
  graphqlContext: any;
}

export interface DeleteContext {
  where: any;
  response: any;
  graphqlContext: any;
}

export interface Hook {
  // create
  wrapCreate?: (context: CreateContext, createOperation: () => Promise<any>) => Promise<any>;

  // update
  wrapUpdate?: (context: UpdateContext, updateOperation: () => Promise<any>) => Promise<any>;

  // delete
  wrapDelete?: (context: DeleteContext, destroyOperation: () => Promise<any>) => Promise<any>;

  // query
  resolveFields?: IResolverObject;
}
