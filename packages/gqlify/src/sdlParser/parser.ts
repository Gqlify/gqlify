import { reduce, values, get } from 'lodash';
import {
  parse,
  visit,
  Kind,
  ObjectTypeDefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { createSdlField, parseDirectiveNode } from './utils';
import { SdlNamedType } from './namedType/interface';
import { SdlScalarType, SdlObjectType, SdlEnumType } from './namedType';

const parseNodeToSdlObjectType = (
  documentNode: DocumentNode,
  node: ObjectTypeDefinitionNode,
  getSdlNamedType: (name: string) => SdlNamedType,
  ): SdlObjectType => {
  const fields = reduce(node.fields, (result, fieldNode) => {
    result[fieldNode.name.value] = createSdlField(documentNode, fieldNode, getSdlNamedType);
    return result;
  }, {});
  const directives = reduce(node.directives, (result, directiveNode) => {
    result[directiveNode.name.value] = parseDirectiveNode(directiveNode);
    return result;
  }, {});
  const interfaces: string[] = node.interfaces.map(namedTypeNode => namedTypeNode.name.value);

  // create SdlObjectType
  const objectType = new SdlObjectType({
    typeDef: node,
    name: node.name.value,
    description: get(node, 'description.value'),
    directives,
    interfaces,
    fields,
  });
  return objectType;
};

const parseNodeToSdlEnumType = (node: EnumTypeDefinitionNode) => {
  return new SdlEnumType({
    typeDef: node,
    name: node.name.value,
    description: get(node, 'description.value'),
    values: node.values.map(valueDefNode => valueDefNode.name.value),
  });
};

export class SdlParser {
  private namedTypeMap: Record<string, SdlNamedType> = {};

  public parse(sdl: string): SdlNamedType[] {
    const documentAST = parse(sdl);

    // construct SdlObjectType with SdlFields
    visit(documentAST, {
      enter: (node, key, parent, path) => {
        // if scalar
        if (node.kind === Kind.SCALAR_TYPE_DEFINITION) {
          // find scalar in map
          const scalarName: string = node.name.value;
          this.namedTypeMap[scalarName] = new SdlScalarType({typeDef: node, name: scalarName});
          return false;
        }

        // if objectType
        if (node.kind === Kind.OBJECT_TYPE_DEFINITION) {
          const objectType = parseNodeToSdlObjectType(documentAST, node, this.getSdlNamedType);
          this.namedTypeMap[node.name.value] = objectType;
          return false;
        }

        // if enum
        if (node.kind === Kind.ENUM_TYPE_DEFINITION) {
          const sdlEnumType = parseNodeToSdlEnumType(node);
          this.namedTypeMap[node.name.value] = sdlEnumType;
          return false;
        }
      },
    });

    return values(this.namedTypeMap);
  }

  public getSdlNamedType = (name: string) => {
    return this.namedTypeMap[name];
  };
}
