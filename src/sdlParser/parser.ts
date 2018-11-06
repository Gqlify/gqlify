import Model from '../dataModel/model';
import { find, isUndefined } from 'lodash';
import {parse, visit, Kind, ObjectTypeDefinitionNode, TypeDefinitionNode, GraphQLScalarType } from 'graphql';
import { isTypeDefinitionNode } from 'graphql/language/predicates';
import RootNode from '../RootNode';
// import { ASTDefinitionBuilder } from 'graphql/utilities/buildASTSchema';
// tslint:disable-next-line:no-var-requires
const { ASTDefinitionBuilder } = require('graphql/utilities/buildASTSchema');

export const API_DIRECTIVE = 'api';

// check of typeDefNode has api directive and is objectTypeDefintionNode
const isApiObjectType = (node: TypeDefinitionNode): boolean => {
  return node.kind === Kind.OBJECT_TYPE_DEFINITION &&
    !isUndefined(find(node.directives, directiveNode => directiveNode.name.value === API_DIRECTIVE));
};

export class SdlParser {
  private scalars: Record<string, GraphQLScalarType>;

  constructor({scalars}: {scalars: Record<string, GraphQLScalarType>}) {
    this.scalars = scalars;
  }

  public parse(sdl: string): Model[] {
    const rootNode = new RootNode();
    const models = [];
    const documentAST = parse(sdl);
    visit(documentAST, {
      enter: (node, key, parent, path) => {
        // if objectTypeNode has api directive, construct sdlObjectType & sdlField
        if (isApiObjectType(node)) {

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
        }

        // if objectType
        // if interface
        // if union
        // if enum
        // if input
      },
    });
    return models;
  }
}
