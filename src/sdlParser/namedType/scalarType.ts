import { SdlNamedType } from './interface';
import { SdlDirective } from '../interface';
import { ScalarTypeDefinitionNode } from 'graphql';

export default class SdlScalarType implements SdlNamedType {
  private typeDef: ScalarTypeDefinitionNode;
  private name: string;
  private description: string;
  private directives: Record<string, SdlDirective>;

  constructor({
    name,
    description,
    directives,
    typeDef,
  }: {
    name: string,
    description?: string,
    directives?: Record<string, SdlDirective>,
    typeDef: ScalarTypeDefinitionNode,
  }) {
    this.name = name;
    this.description = description;
    this.directives = directives || {};
    this.typeDef = typeDef;
  }

  public getName() {
    return this.name;
  }

  public getDescription() {
    return this.description;
  }

  public getDirectives() {
    return this.directives;
  }

  public getTypeDef() {
    return this.typeDef;
  }
}
