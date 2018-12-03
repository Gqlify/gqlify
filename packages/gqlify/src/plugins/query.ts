import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';
import { ListReadable } from '../dataSource/interface';
import { pick } from 'lodash';

const parsePaginationFromArgs = (args: Record<string, any>) => {
  if (!args) {
    return null;
  }

  return pick(args, ['first', 'last', 'before', 'after']);
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
      after: String
    ): [${modelType}]`);
  }

  public resolveInQuery({
    model,
    dataSource,
  }: {
    model: Model,
    dataSource: ListReadable,
  }) {
    const findOneQueryName = this.createFindOneQueryName(model);
    const findManyQueryName = this.createFindQueryName(model);
    return {
      [findOneQueryName]: async (root, args, context) => {
        const where = this.whereInputPlugin.parseUniqueWhere(args.where);
        return dataSource.findOne({where});
      },
      [findManyQueryName]: async (root, args, context) => {
        const where = this.whereInputPlugin.parseWhere(args.where);
        const pagination = parsePaginationFromArgs(args);
        const response = await dataSource.find({where, pagination});
        return response.data;
      },
    };
  }

  private createFindQueryName(model: Model) {
    return model.getNamings().plural;
  }

  private createFindOneQueryName(model: Model) {
    return model.getNamings().singular;
  }
}
