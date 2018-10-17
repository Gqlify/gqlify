import {Plugin, Context} from './plugins/interface';
import RootNode from './rootNode';
import Model from './dataModel/model';

export default class Generator {
  private plugins: Plugin[];
  private context: Context;

  constructor({
    plugins,
  }: {
    plugins: Plugin[],
  }) {
    this.plugins = plugins;
    this.context = {
      root: new RootNode(),
    };
  }

  public generate(models: Model[]) {
    this.plugins.forEach(plugin => {
      if (plugin.setPlugins) {
        plugin.setPlugins(this.plugins);
      }

      if (plugin.init) {
        plugin.init(this.context);
      }
    });

    // visit models
    models.forEach(
      model => this.plugins.forEach(plugin => plugin.visitModel(model, this.context)),
    );

    // build graphql
    return this.context.root.buildRoot();
  }
}
