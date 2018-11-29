import {
  BaseTypePlugin,
  WhereInputPlugin,
  QueryPlugin,
  CreatePlugin,
  UpdatePlugin,
  DeletePlugin,
} from './plugins';
import { createRelation, Model } from './dataModel';
import { parse } from './parse';
import { MODEL_DIRECTIVE, MODEL_DIRECTIVE_SOURCE_NAME } from './constants';
import { omit, forEach, values } from 'lodash';
import Generator from './generator';
import { createRelationHooks } from './hooks/relationHook';
import mergeHooks from './hooks/mergeHooks';
import combine from './resolver/combine';
import { DataSource } from './dataSource/interface';
import { IResolvers } from 'graphql-tools';
import gql from 'graphql-tag';
import { GraphQLScalarType } from 'graphql';
import { Config } from 'apollo-server';
import { printModels, printRelations } from './printer';
import chalk from 'chalk';

export class Gqlify {
  private sdl: string;
  private dataSources: Record<string, (args: any) => DataSource>;
  private scalars: Record<string, GraphQLScalarType>;

  constructor({
    sdl,
    dataSources,
    scalars,
  }: {
    sdl: string,
    dataSources: Record<string, (args: any) => DataSource>,
    scalars?: Record<string, GraphQLScalarType>,
  }) {
    this.sdl = sdl;
    this.dataSources = dataSources;
    this.scalars = scalars;
  }

  public createServerConfig(): {typeDefs: string, resolvers: IResolvers, scalars?: Record<string, GraphQLScalarType> } {
    // tslint:disable-next-line:no-console
    console.log(chalk.magenta(`Starting Gqlify...\n`));

    const {rootNode, models} = parse(this.sdl);
    const modelMap: Record<string, Model> = {};

    // bind dataSource
    models.forEach(model => {
      // make it easy to accsss later
      modelMap[model.getName()] = model;

      // constuct data source
      const dataSourceArgs = model.getMetadata(MODEL_DIRECTIVE);
      const dataSourceIdentifier: string = dataSourceArgs[MODEL_DIRECTIVE_SOURCE_NAME];
      const createDataSource: (args: any) => DataSource = this.dataSources[dataSourceIdentifier];
      if (!createDataSource) {
        throw new Error(`dataSource ${dataSourceIdentifier} does not exist`);
      }
      const args = omit(dataSourceArgs, MODEL_DIRECTIVE_SOURCE_NAME);
      const dataSource = createDataSource(args);

      // set to model
      model.setDataSource(dataSource);
    });

    // create relation hooks
    const relations = createRelation(models);
    const relationHooks = createRelationHooks(relations);

    // print
    printModels(models);
    printRelations(relations);

    // merge hooks
    const hookMap = mergeHooks(relationHooks);

    // initialize plugins
    const plugins = [
      new BaseTypePlugin(),
      new WhereInputPlugin(),
      new QueryPlugin(),
      new CreatePlugin({hook: hookMap}),
      new UpdatePlugin({hook: hookMap}),
      new DeletePlugin({hook: hookMap}),
    ];

    // set resolver from hook
    forEach(hookMap, (hook, key) => {
      if (!modelMap[key]) {
        throw new Error(`model ${key} not found for hooks`);
      }
      modelMap[key].overrideResolver(hook.resolveFields);
    });

    // add scalar to rootNode
    if (this.scalars) {
      values(this.scalars).forEach(scalar => {
        rootNode.addScalar(scalar);
      });
    }

    // construct graphql server config
    const generator = new Generator({ plugins, rootNode });
    const resolvers = combine(plugins, models);
    const typeDefs = generator.generate(models);

    return {
      typeDefs,
      resolvers,
      scalars: this.scalars,
    };
  }

  public createApolloConfig(): Config {
    const serverConfig = this.createServerConfig();
    // gql typeDefs
    const typeDefs = gql(serverConfig.typeDefs);
    // merge scalars into resolvers
    const resolvers = serverConfig.scalars
      ? {
        ...serverConfig.resolvers,
        ...serverConfig.scalars,
      } : serverConfig.resolvers;
    return {
      ...serverConfig,
      typeDefs,
      resolvers,
    };
  }
}
