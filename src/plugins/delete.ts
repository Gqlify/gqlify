import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';
import { ListMutable } from '../dataSource/interface';

export default class DeletePlugin implements Plugin {
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

    // create
    const mutationName = this.getInputName(model);
    const where = this.whereInputPlugin.getWhereUniqueInputName(model);
    const returnType = this.createUniqueReturnType(model, context);
    root.addMutation(`${mutationName}(where: ${where}!): ${returnType}`);
  }

  public resolveInMutation({model, dataSource}: {model: Model, dataSource: ListMutable}) {
    const inputName = this.getInputName(model);
    return {
      [inputName]: async (root, args, context) => {
        const whereUnique = this.whereInputPlugin.parseUniqueWhere(args.where);
        return dataSource.delete(whereUnique);
      },
    };
  }

  private createUniqueReturnType(model: Model, context: Context) {
    const uniqueFields = model.getUniqueFields();
    const typename = this.getReturnTypename(model);
    const fields = uniqueFields.map(field => `${field.getName()}: ${field.getTypename()}`).join(' ');
    const type = `type ${typename} {
      ${fields}
    }`;
    context.root.addObjectType(type);
    return typename;
  }

  private getInputName(model: Model) {
    return `delete${model.getNamings().capitalSingular}`;
  }

  private getReturnTypename(model: Model) {
    return `${model.getNamings().capitalSingular}WithUniqueFields`;
  }
}
