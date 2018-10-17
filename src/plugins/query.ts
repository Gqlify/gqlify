import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';

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
    const findOneQueryName = model.getNamings().singular;
    const whereUniqueInputName = this.whereInputPlugin.getWhereUniqueInputName(model);
    root.addQuery(findOneQueryName, `${findOneQueryName}(where: ${whereUniqueInputName}!): ${modelType}`);

    // find many query
    const findManyQueryName = model.getNamings().plural;
    const whereInputName = this.whereInputPlugin.getWhereInputName(model);
    root.addQuery(findManyQueryName, `${findManyQueryName}(where: ${whereInputName}!): [${modelType}]`);
  }
}
