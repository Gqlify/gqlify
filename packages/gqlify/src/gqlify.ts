import {
  BaseTypePlugin,
  WhereInputPlugin,
  QueryPlugin,
  CreatePlugin,
  UpdatePlugin,
  DeletePlugin,
  RelayPlugin,
  Plugin,
} from './plugins';
import { createRelation, Model } from './dataModel';
import { parse } from './parse';
import { MODEL_DIRECTIVE, MODEL_DIRECTIVE_SOURCE_NAME, OBJECT_DIRECTIVE } from './constants';
import { omit, forEach, values, get, isUndefined, isEmpty } from 'lodash';
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
import RootNode from './rootNode';

export class Gqlify {
  private sdl: string;
  private dataSources: Record<string, (args: any) => DataSource>;
  private scalars: Record<string, GraphQLScalarType>;
  private context: any;
  private rootNode: RootNode;
  private models: Model[];
  private userDefinedPlugins: Plugin[];
  private skipPrint: boolean;

  constructor({
    sdl,
    dataSources,
    scalars,
    context,
    skipPrint,
    rootNode,
    models,
    plugins,
  }: {
    sdl?: string,
    dataSources?: Record<string, (args: any) => DataSource>,
    scalars?: Record<string, GraphQLScalarType>,
    context?: any,
    skipPrint?: boolean,
    rootNode?: RootNode,
    models?: Model[],
    plugins?: Plugin[],
  }) {
    this.sdl = sdl;
    this.dataSources = dataSources;
    this.scalars = scalars;
    this.context = context;
    this.skipPrint = skipPrint;
    this.rootNode = rootNode;
    this.models = models;
    this.userDefinedPlugins = plugins;
  }

  public createServerConfig(): {
    typeDefs: string,
    resolvers: IResolvers,
    scalars?: Record<string, GraphQLScalarType>,
    context?: any,
  } {
    const ifSkipPrint = get(this, 'skipPrint', false);
    if (!ifSkipPrint) {
      // tslint:disable-next-line:no-console
      console.log(chalk.magenta(`Starting Gqlify...\n`));
    }

    let rootNode: RootNode;
    let models: Model[] = [];
    if (isUndefined(this.rootNode) || isEmpty(this.models)) {
      const parseResult = parse(this.sdl);
      rootNode = parseResult.rootNode;
      models = parseResult.models;
    } else {
      rootNode = this.rootNode;
      models = this.models;
    }
    const modelMap: Record<string, Model> = {};

    // bind dataSource
    models.forEach(model => {
      // make it easy to access later
      modelMap[model.getName()] = model;

      if (!model.getDataSource()) {
        // construct data source
        // get dataSource arguments from GQLifyModel or GQLifyObject
        const dataSourceArgs = model.getMetadata(MODEL_DIRECTIVE) || model.getMetadata(OBJECT_DIRECTIVE);
        const dataSourceIdentifier: string = dataSourceArgs[MODEL_DIRECTIVE_SOURCE_NAME];
        const createDataSource: (args: any) => DataSource = this.dataSources[dataSourceIdentifier];
        if (!createDataSource) {
          throw new Error(`dataSource ${dataSourceIdentifier} does not exist`);
        }
        const args = omit(dataSourceArgs, MODEL_DIRECTIVE_SOURCE_NAME);
        const dataSource = createDataSource(args);

        // set to model
        model.setDataSource(dataSource);
      }
    });

    // create relation hooks
    const relations = createRelation(models);
    const relationHooks = createRelationHooks(relations);

    // print
    if (!ifSkipPrint) {
      printModels(models);
      printRelations(relations);
    }

    // merge hooks
    const hookMap = mergeHooks(relationHooks);

    // initialize plugins
    const plugins = [
      new BaseTypePlugin(),
      new WhereInputPlugin(),
      new QueryPlugin(),
      new RelayPlugin(),
      new CreatePlugin({hook: hookMap}),
      new UpdatePlugin({hook: hookMap}),
      new DeletePlugin({hook: hookMap}),
      ...this.userDefinedPlugins || [],
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
    const resolvers = combine(rootNode.getResolvers(), plugins, models);
    const typeDefs = generator.generate(models);

    return {
      typeDefs,
      resolvers,
      scalars: this.scalars,
      context: this.context,
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
