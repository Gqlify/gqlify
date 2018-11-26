import { ApolloServer, gql } from 'apollo-server';
import {
  BaseTypePlugin,
  WhereInputPlugin,
  QueryPlugin,
  CreatePlugin,
  UpdatePlugin,
  DeletePlugin,
} from './plugins';
import { createRelation } from './dataModel';
import { parse } from './parse';
import { MODEL_DIRECTIVE, MODEL_DIRECTIVE_SOURCE_NAME } from './constants';
import { omit } from 'lodash';
import Generator from './generator';
import { createRelationHooks } from './hooks/relationHook';
import mergeHooks from './hooks/mergeHooks';
import combine from './resolver/combine';
import { DataSource } from './dataSource/interface';

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

  public serve() {
    const {rootNode, models} = parse(this.sdl);

    // bind dataSource
    models.forEach(model => {
      const dataSourceArgs = model.getMetadata(MODEL_DIRECTIVE);
      const dataSourceIdentifier: string = dataSourceArgs[MODEL_DIRECTIVE_SOURCE_NAME];
      const createDataSource: (args: any) => DataSource = this.dataSources[dataSourceIdentifier];
      const args = omit(dataSourceArgs, MODEL_DIRECTIVE_SOURCE_NAME);
      const dataSource = createDataSource(args);

      model.setDataSource(dataSource);
    });

    // create relation hooks
    const relations = createRelation(models);
    const relationHooks = createRelationHooks(relations);

    // merge hooks
    const hooks = mergeHooks(relationHooks);

    // initialize plugins
    const plugins = [
      new BaseTypePlugin(),
      new WhereInputPlugin(),
      new QueryPlugin(),
      new CreatePlugin(hooks),
      new UpdatePlugin(hooks),
      new DeletePlugin(hooks),
    ];

    const generator = new Generator({ plugins, rootNode });
    const resolvers = combine(plugins, models);

    const typeDefs = gql(generator.generate(models));
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    server.listen().then(({ url }) => {
      // tslint:disable-next-line:no-console
      console.log(`🚀 Server ready at ${url}`);
    });
  }
}
