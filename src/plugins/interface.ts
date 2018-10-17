import Model from '../dataModel/model';
import RootNode from '../rootNode';

// Plugins is responsible for graphql generation and resolvers
export interface Plugin {
  init?(context: Context): void;
  setPlugins?(plugins: Plugin[]): void;
  visitModel(model: Model, context: Context): void;
}

export interface Context {
  root: RootNode;
}
