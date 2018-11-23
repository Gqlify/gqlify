import { ApolloServer, gql } from 'apollo-server';
import {
  BaseTypePlugin,
  WhereInputPlugin,
  QueryPlugin,
  CreatePlugin,
  UpdatePlugin,
  DeletePlugin,
} from './plugins';
import { Hook } from './hooks/interface';
import { createRelation } from './dataModel';
import { parse } from './parse';
import { MODEL_DIRECTIVE, MODEL_DIRECTIVE_SOURCE_NAME } from './constants';
import { omit } from 'lodash';
import Generator from './generator';

export class GqlifyServer {
  private sdl: string;
  private dataSources: Record<string, any>;

  constructor({
    sdl,
    dataSources,
  }: {
    sdl: string,
    dataSources: Record<string, any>,
  }) {
    this.sdl = sdl;
    this.dataSources = dataSources;
  }

  private serve() {
    const {rootNode, models} = parse(this.sdl);

    // bind dataSource
    models.forEach(model => {
      const dataSourceArgs = model.getMetadata(MODEL_DIRECTIVE);
      const dataSourceIdentifier: string = dataSourceArgs[MODEL_DIRECTIVE_SOURCE_NAME];
      const dataSource = this.dataSources[dataSourceIdentifier];
      dataSource.setArgs(omit(dataSourceArgs, MODEL_DIRECTIVE_SOURCE_NAME));

      model.setDataSource(dataSource);
    });

    // create hooks

    const plugins = [
      new BaseTypePlugin(),
      new WhereInputPlugin(),
      new QueryPlugin(),
      new CreatePlugin(),
      new UpdatePlugin(),
      new DeletePlugin(),
    ];

    const generator = new Generator({ plugins });
    const resolvers = combine(plugins, models);
  }
}
