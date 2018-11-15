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
import { createSdlField, parseDirectiveNode, createDataModelFromSdlObjectType } from './utils';
import { SdlNamedType } from './namedType/interface';
import { MODEL_DIRECTIVE } from './constants';
import { BasicFieldMiddware, MetadataMiddleware, SdlMiddleware } from './middlewares';
import { SdlScalarType, SdlObjectType, SdlEnumType } from './namedType';

// check of typeDefNode has api directive and is objectTypeDefintionNode
const isGqlifyModel = (node: TypeDefinitionNode): boolean => {
  return node.kind === Kind.OBJECT_TYPE_DEFINITION &&
    !isUndefined(find(node.directives, directiveNode => directiveNode.name.value === MODEL_DIRECTIVE));
};

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

  // create SdlObjectType
  const objectType = new SdlObjectType({
    typeDef: node,
    name: node.name.value,
    description: get(node, 'description.value'),
    directives,
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
        // if objectTypeNode has api directive
        // if (isGqlifyModel(node)) {
        //   // construct sdlObjectType & sdlField
        //   const objectType = parseNodeToSdlObjectType(documentAST, node, this.getSdlNamedType);
        //   this.namedTypeMap[node.name.value] = objectType;
        //   this.apiObjectTypeMap[node.name.value] = objectType;
        //   // skip visiting
        //   return false;
        // }

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

    // // construct model from SdlObjectType
    // forEach(this.apiObjectTypeMap, (sdlObjectType, key) => {
    //   const model = createDataModelFromSdlObjectType(sdlObjectType, this.isGqlifyModel, this.getModel);
    //   this.modelMap[key] = model;
    // });

    // // go through middlewares
    // const middlewares: SdlMiddleware[] = [
    //   new BasicFieldMiddware(),
    //   new MetadataMiddleware(),
    // ];

    // // visit objectType
    // forEach(this.namedTypeMap, namedType => {
    //   if (namedType instanceof SdlObjectType) {
    //     middlewares.forEach(mid => mid.visitObjectType && mid.visitObjectType(namedType));
    //   }
    // });

    // // visit model & fields
    // forEach(this.modelMap, (model, key) => {
    //   const sdlObjectType = this.getSdlNamedType(key) as SdlObjectType;
    //   middlewares.forEach(mid =>  mid.visitGqlifyModel && mid.visitGqlifyModel({
    //     model,
    //     sdlObjectType,
    //   }));

    //   // visit fields
    //   forEach(model.getFields(), (dataModelField, name) => {
    //     const sdlField = sdlObjectType.getField(name);
    //     middlewares.forEach(mid => mid.visitField && mid.visitField({
    //       model,
    //       field: dataModelField,
    //       sdlObjectType,
    //       sdlField,
    //     }));
    //   });
    // });

    // return {rootNode, models: values(this.modelMap)};
  }

  private getSdlNamedType = (name: string) => {
    return this.namedTypeMap[name];
  };

  private isGqlifyModel = (sdlNamedType: SdlNamedType) => {
    return Boolean(sdlNamedType.getDirectives()[MODEL_DIRECTIVE]);
  };
}
