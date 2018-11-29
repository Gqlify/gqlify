import Model from '../dataModel/model';
import RootNode from '../rootNode';
import { IResolverObject, IResolvers } from 'graphql-tools';

// Plugins is responsible for graphql generation and resolvers
export interface Plugin {
  init?(context: Context): void;
  setPlugins?(plugins: Plugin[]): void;
  visitModel(model: Model, context: Context): void;
  resolveInQuery?({model, dataSource}: {model: Model, dataSource: any}): IResolverObject;
  resolveInMutation?({model, dataSource}: {model: Model, dataSource: any}): IResolverObject;
  resolveInRoot?({model, dataSource}: {model: Model, dataSource: any}): IResolvers;
}

export interface Context {
  root: RootNode;
}
