/**
 * Relay Cursor Connections API
 * https://facebook.github.io/relay/graphql/connections.htm
 */

import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';
import { ListReadable } from '../dataSource/interface';
import { pick, isFunction, first, get, last } from 'lodash';

const parsePaginationFromArgs = (args: Record<string, any>) => {
  if (!args) {
    return null;
  }

  return pick(args, ['first', 'last', 'before', 'after']);
};

const resolvePromiseOrScalar = <T>(promiseOrScalar: T | (() => Promise<T>)): T | Promise<T> => {
  return isFunction(promiseOrScalar) ? promiseOrScalar() : promiseOrScalar;
};

export default class RelayPlugin implements Plugin {
  private whereInputPlugin: WhereInputPlugin;
  private baseTypePlugin: BaseTypePlugin;

  public init(context: Context) {
    const { root } = context;
    // add PageInfo type
    root.addObjectType(`
      type PageInfo {
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
        startCursor: String
        endCursor: String
      }`);
    root.addResolver({
      PageInfo: {
        hasNextPage: (pageInfo: any) => resolvePromiseOrScalar<boolean>(pageInfo.hasNextPage),
        hasPreviousPage: (pageInfo: any) => resolvePromiseOrScalar<boolean>(pageInfo.hasPreviousPage),
      },
    });
  }

  public setPlugins(plugins: Plugin[]) {
    this.whereInputPlugin = plugins.find(
      plugin => plugin instanceof WhereInputPlugin) as WhereInputPlugin;
    this.baseTypePlugin = plugins.find(
      plugin => plugin instanceof BaseTypePlugin) as BaseTypePlugin;
  }

  public visitModel(model: Model, context: Context) {
    // object type model dont need relay query
    if (model.isObjectType()) {
      return;
    }
    const { root } = context;
    const modelType = this.baseTypePlugin.getTypename(model);

    // add edge type
    const edgeType = this.createEdgeType(model);
    root.addObjectType(`
      type ${edgeType} {
        node: ${modelType}!
        cursor: String
      }
    `);

    // add connection type
    const connectionType = this.createConnectionType(model);
    root.addObjectType(`
      type ${connectionType} {
        pageInfo: PageInfo!
        edges: [${edgeType}]!
      }
    `);

    // connection query
    const queryName = this.createConnectionQueryName(model);
    const whereInputName = this.whereInputPlugin.getWhereInputName(model);
    root.addQuery(`${queryName}(
      where: ${whereInputName}
      first: Int
      last: Int
      before: String
      after: String
    ): ${connectionType}!`);
  }

  public resolveInQuery({
    model,
    dataSource,
  }: {
    model: Model,
    dataSource: ListReadable,
  }) {
    // object type model dont need relay query
    if (model.isObjectType()) {
      return;
    }

    // list api
    const queryName = this.createConnectionQueryName(model);
    return {
      [queryName]: async (root, args, context) => {
        const where = this.whereInputPlugin.parseWhere(args.where);
        const pagination = parsePaginationFromArgs(args);
        const response = await dataSource.find({where, pagination}, context);
        const connectionData = {
          pageInfo: {
            hasNextPage: response.hasNextPage,
            hasPreviousPage: response.hasPreviousPage,
            // might change to a new design without id later
            startCursor: get(first(response.data), 'id'),
            endCursor: get(last(response.data), 'id'),
          },
          edges: response.data.map(node => {
            return {
              cursor: node.id,
              node,
            };
          }),
        };
        return connectionData;
      },
    };
  }

  private createConnectionQueryName(model: Model) {
    return `${model.getNamings().plural}Connection`;
  }

  private createConnectionType(model: Model) {
    return `${model.getNamings().capitalSingular}Connection`;
  }

  private createEdgeType(model: Model) {
    return `${model.getNamings().capitalSingular}Edge`;
  }
}
