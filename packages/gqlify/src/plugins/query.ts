import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';
import { ListReadable, MapReadable, OrderBy } from '../dataSource/interface';
import { pick, isEmpty } from 'lodash';
import { GraphQLScalarType } from 'graphql';

const parsePaginationFromArgs = (args: Record<string, any>) => {
  if (!args) {
    return null;
  }

  return pick(args, ['first', 'last', 'before', 'after', 'orderBy']);
};
const parseOrderBy = (args: Record<string, any>): OrderBy  => {
  if (args.orderBy) {
    return {
      field: args.orderBy.split('_')[0],
      value: (args.orderBy.split('_')[1] === 'DESC') ? -1 : 1,
    };
  }
  return null;
};
export default class QueryPlugin implements Plugin {
  private whereInputPlugin: WhereInputPlugin;
  private baseTypePlugin: BaseTypePlugin;

  public setPlugins(plugins: Plugin[]) {
    this.whereInputPlugin = plugins.find(
      plugin => plugin instanceof WhereInputPlugin) as WhereInputPlugin;
    this.baseTypePlugin = plugins.find(
      plugin => plugin instanceof BaseTypePlugin) as BaseTypePlugin;
  }

  public visitModel(model: Model, context: Context) {
    const { root } = context;
    const modelType = this.baseTypePlugin.getTypename(model);

    // object query
    if (model.isObjectType()) {
      const queryName = this.createObjectQueryName(model);
      root.addQuery(`${queryName}: ${modelType}`);
      return;
    }

    const modelOrderByInputName = this.getOrderByInputName(model);
    const orderByScalar = new GraphQLScalarType({
      name: `${modelOrderByInputName}`,
      serialize: (val: string): string => val,
      parseValue: (val: string): string => val,
      parseLiteral(ast) {
        return ast.value;
      },
    });
    root.addScalar(orderByScalar);

    // find one query
    const findOneQueryName = this.createFindOneQueryName(model);
    const whereUniqueInputName = this.whereInputPlugin.getWhereUniqueInputName(model);
    root.addQuery(`${findOneQueryName}(where: ${whereUniqueInputName}!): ${modelType}`);

    // find many query
    const findManyQueryName = this.createFindQueryName(model);
    const whereInputName = this.whereInputPlugin.getWhereInputName(model);
    root.addQuery(`${findManyQueryName}(
      where: ${whereInputName},
      first: Int,
      last: Int,
      before: String,
      after: String,
      orderBy: ${modelOrderByInputName},
    ): [${modelType}]`);
  }

  public resolveInQuery({
    model,
    dataSource,
  }: {
    model: Model,
    dataSource: ListReadable & MapReadable,
  }) {
    // object query
    if (model.isObjectType()) {
      const queryName = this.createObjectQueryName(model);
      return {
        [queryName]: async () => {
          const response = await dataSource.getMap();
          // make sure graphql query get empty object
          return isEmpty(response) ? {} : response;
        },
      };
    }

    // list query
    const findOneQueryName = this.createFindOneQueryName(model);
    const findManyQueryName = this.createFindQueryName(model);
    return {
      [findOneQueryName]: async (root, args, context) => {
        const where = this.whereInputPlugin.parseUniqueWhere(args.where);
        return dataSource.findOne({where}, context);
      },
      [findManyQueryName]: async (root, args, context) => {
        const where = this.whereInputPlugin.parseWhere(args.where);
        const pagination = parsePaginationFromArgs(args);
        const orderBy = parseOrderBy(args);
        const response = await dataSource.find({where, pagination, orderBy}, context);
        return response.data;
      },
    };
  }

  private createObjectQueryName(model: Model) {
    return model.getNamings().singular;
  }

  private createFindQueryName(model: Model) {
    return model.getNamings().plural;
  }

  private createFindOneQueryName(model: Model) {
    return model.getNamings().singular;
  }

  private getOrderByInputName(model: Model) {
    return `${model.getNamings().capitalSingular}OrderByInput`;
  }
}
