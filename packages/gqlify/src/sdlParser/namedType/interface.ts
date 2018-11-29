import { SdlDirective } from '../interface';
import { TypeDefinitionNode } from 'graphql';

export interface SdlNamedType<TypeDef = TypeDefinitionNode> {
  getTypeDef(): TypeDef;
  getName(): string;
  getDescription(): string;
  getDirectives(): Record<string, SdlDirective>;
}
