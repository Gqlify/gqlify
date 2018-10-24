import Model from '../dataModel/model';
import { recursiveCreateType } from './utils';
import { Context, Plugin } from './interface';

export default class BaseTypePlugin implements Plugin {
  public visitModel(model: Model, context: Context) {
    const { root } = context;
    const modelTypename = this.getTypename(model);
    const fields: string[] = recursiveCreateType(model.getFields(), context);
    root.addType(modelTypename, `
    type ${modelTypename} {
      ${fields.join(' ')}
    }`);
  }

  public resolveInRoot({model}: {model: Model}) {
    const modelTypename = this.getTypename(model);
    const resolver = model.getResolver();
    if (resolver) {
      return {
        [modelTypename]: resolver,
      };
    }
  }

  public getTypename(model: Model) {
    return model.getTypename();
  }
}
