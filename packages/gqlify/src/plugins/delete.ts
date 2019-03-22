import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import WhereInputPlugin from './whereInput';
import BaseTypePlugin from './baseType';
import { ListMutable } from '../dataSource/interface';
import { reduce, get } from 'lodash';
import { Hook, DeleteContext } from '../hooks/interface';

export default class DeletePlugin implements Plugin {
  private whereInputPlugin: WhereInputPlugin;
  private baseTypePlugin: BaseTypePlugin;
  private hook: Hook;

  constructor({
    hook,
  }: {
    hook: Hook,
  }) {
    this.hook = hook;
  }

  public setPlugins(plugins: Plugin[]) {
    this.whereInputPlugin = plugins.find(
      plugin => plugin instanceof WhereInputPlugin) as WhereInputPlugin;
    this.baseTypePlugin = plugins.find(
      plugin => plugin instanceof BaseTypePlugin) as BaseTypePlugin;
  }

  public visitModel(model: Model, context: Context) {
    // object type model dont need delete mutation
    if (model.isObjectType()) {
      return;
    }
    const { root } = context;
    const modelType = this.baseTypePlugin.getTypename(model);

    // create
    const mutationName = this.getInputName(model);
    const where = this.whereInputPlugin.getWhereUniqueInputName(model);
    const returnType = this.createUniqueReturnType(model, context);
    root.addMutation(`${mutationName}(where: ${where}!): ${returnType}`);
  }

  public resolveInMutation({model, dataSource}: {model: Model, dataSource: ListMutable}) {
    // object type model dont need delete mutation
    if (model.isObjectType()) {
      return;
    }
    const inputName = this.getInputName(model);
    const wrapDelete = get(this.hook, [model.getName(), 'wrapDelete']);

    return {
      [inputName]: async (root, args, context) => {
        const whereUnique = this.whereInputPlugin.parseUniqueWhere(args.where);
        if (!wrapDelete) {
          await dataSource.delete(whereUnique, context);
          return args.where;
        }

        // wrap
        const deleteContext: DeleteContext = {where: args.where, response: {}, graphqlContext: context};
        await wrapDelete(deleteContext, async ctx => {
          await dataSource.delete(whereUnique, context);
        });
        return args.where;
      },
    };
  }

  private createUniqueReturnType(model: Model, context: Context) {
    const uniqueFields = model.getUniqueFields();
    const typename = this.getReturnTypename(model);
    const fields = reduce(uniqueFields,
      (arr, field, name) => {
        arr.push(`${name}: ${field.getTypename()}`);
        return arr;
      }, []).join(' ');
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
