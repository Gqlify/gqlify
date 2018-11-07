import Model from '../dataModel/model';
import { find, isUndefined, reduce, forEach, values, get } from 'lodash';
import {
  parse,
  visit,
  Kind,
  ObjectTypeDefinitionNode,
  TypeDefinitionNode,
  GraphQLScalarType,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import RootNode from '../RootNode';
import SdlObjectType from './namedType/objectType';
import { createSdlField, parseDirectiveNode, createDataModelFromSdlObjectType } from './utils';
import SdlEnumType from './namedType/enumType';
import { SdlNamedType } from './namedType/interface';
import { API_DIRECTIVE } from './constants';

// check of typeDefNode has api directive and is objectTypeDefintionNode
const isApiObjectType = (node: TypeDefinitionNode): boolean => {
  return node.kind === Kind.OBJECT_TYPE_DEFINITION &&
    !isUndefined(find(node.directives, directiveNode => directiveNode.name.value === API_DIRECTIVE));
};

const parseNodeToSdlObjectType = (
  documentNode: DocumentNode,
  node: ObjectTypeDefinitionNode,
  getSdlNamedType: (name: string) => SdlNamedType,
  ): SdlObjectType => {
  const fields = reduce(node.fields, (result, fieldNode) => {
    result[node.name.value] = createSdlField(documentNode, fieldNode, getSdlNamedType);
    return result;
  }, {});
  const directives = reduce(node.directives, (result, directiveNode) => {
    result[directiveNode.name.value] = parseDirectiveNode(directiveNode);
    return result;
  }, {});
  // create SdlObjectType
  const objectType = new SdlObjectType({
    name: node.name.value,
    description: get(node, 'description.value'),
    directives,
    fields,
  });
  return objectType;
};

const parseNodeToSdlEnumType = (node: EnumTypeDefinitionNode) => {
  return new SdlEnumType({
    name: node.name.value,
    description: get(node, 'description.value'),
    values: node.values.map(valueDefNode => valueDefNode.name.value),
  });
};

export class SdlParser {
  private scalars: Record<string, GraphQLScalarType>;
  private namedTypeMap: Record<string, SdlNamedType> = {};
  private apiObjectTypeMap: Record<string, SdlObjectType> = {};
  private modelMap: Record<string, Model> = {};

  constructor({scalars}: {scalars?: Record<string, GraphQLScalarType>}) {
    this.scalars = scalars || {};
  }

  public parse(sdl: string): {rootNode: RootNode, models: Model[]} {
    const rootNode = new RootNode();
    const documentAST = parse(sdl);

    // construct SdlObjectType with SdlFields
    visit(documentAST, {
      enter: (node, key, parent, path) => {
        // if objectTypeNode has api directive
        if (isApiObjectType(node)) {
          // construct sdlObjectType & sdlField
          const objectType = parseNodeToSdlObjectType(documentAST, node, this.getSdlNamedType);
          this.namedTypeMap[node.name.value] = objectType;
          this.apiObjectTypeMap[node.name.value] = objectType;
          // skip visiting
          return false;
        }

        // if scalar
        if (node.kind === Kind.SCALAR_TYPE_DEFINITION) {
          // find scalar in map
          const scalarName = node.name.value;
          const scalar = this.scalars[scalarName];
          if (!scalar) {
            throw new Error(`Scalar ${scalarName} not found in scalar map`);
          }

          rootNode.addScalar(scalarName, scalar);
          return false;
        }

        // if objectType
        if (node.kind === Kind.OBJECT_TYPE_DEFINITION) {
          const objectType = parseNodeToSdlObjectType(documentAST, node, this.getSdlNamedType);
          this.namedTypeMap[node.name.value] = objectType;
          rootNode.addObjectType(node);
          return false;
        }

        // if interface
        if (node.kind === Kind.INTERFACE_TYPE_DEFINITION) {
          rootNode.addInterface(node);
          return false;
        }

        // if union
        if (node.kind === Kind.UNION_TYPE_DEFINITION) {
          rootNode.addUnion(node);
          return false;
        }

        // if enum
        if (node.kind === Kind.ENUM_TYPE_DEFINITION) {
          const sdlEnumType = parseNodeToSdlEnumType(node);
          this.namedTypeMap[node.name.value] = sdlEnumType;
          rootNode.addEnum(node);
          return false;
        }

        // if input
        if (node.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
          rootNode.addInput(node);
          return false;
        }
      },
    });

    // construct model from SdlObjectType
    forEach(this.apiObjectTypeMap, (sdlObjectType, key) => {
      const model = createDataModelFromSdlObjectType(sdlObjectType, this.isApiObjectType, this.getModel);
      this.modelMap[key] = model;
    });

    return {rootNode, models: values(this.modelMap)};
  }

  private getSdlNamedType = (name: string) => {
    return this.namedTypeMap[name];
  };

  private isApiObjectType = (sdlNamedType: SdlNamedType) => {
    return Boolean(sdlNamedType.getDirectives()[API_DIRECTIVE]);
  };

  private getModel = (name: string) => {
    return this.modelMap[name];
  };
}
