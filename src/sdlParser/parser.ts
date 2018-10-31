import Model from '../dataModel/model';
import { parse, visit, TypeInfo } from 'graphql';
import { SdlFieldType, EnumField } from './field';

export class SdlParser {
  public parse(sdl: string): Model[] {
    const models = [];
    const ast = parse(sdl);
    const type = new TypeInfo(ast);
    // visit(ast, {
    //   enter(node, key, parent, path) {
    //     console.log(key);
    //     console.log(node);
    //   },
    // });
    return models;
  }
}
