import Model from '../dataModel/model';
import { parse, visit } from 'graphql';

export class SdlParser {
  public parse(sdl: string): Model[] {
    const models = [];
    const ast = parse(sdl);
    visit(ast, {
      enter(node, key, parent, path) {
        console.log(key);
        console.log(node);
      },
    });
    return models;
  }
}
