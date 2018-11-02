import Model from '../dataModel/model';
import { parse, visit, TypeInfo, TypeDefinitionNode, Kind, GraphQLNamedType, FieldDefinitionNode } from 'graphql';
import { isTypeDefinitionNode } from 'graphql/language/predicates';
// import { ASTDefinitionBuilder } from 'graphql/utilities/buildASTSchema';
// tslint:disable-next-line:no-var-requires
const { ASTDefinitionBuilder } = require('graphql/utilities/buildASTSchema');

export class SdlParser {
  public parse(sdl: string): Model[] {
    const models = [];
    const documentAST = parse(sdl);
    const typeDefs: TypeDefinitionNode[] = [];
    const nodeMap: Record<string, TypeDefinitionNode> = {};
    for (let def of documentAST.definitions) {
      if (isTypeDefinitionNode(def)) {
        def = def as TypeDefinitionNode;
        const typeName = def.name.value;
        if (nodeMap[typeName]) {
          throw new Error(`Type "${typeName}" was defined more than once.`);
        }
        typeDefs.push(def);
        nodeMap[typeName] = def;
      }
    }
    const definitionBuilder = new ASTDefinitionBuilder(
      nodeMap,
      {},
      typeRef => {
        throw new Error(`Type "${typeRef.name.value}" not found in document.`);
      },
    );
    console.log(definitionBuilder._cache);
    const fieldDef = (parse(`type x{add(x: [Int!]!): Int @cool}`).definitions[0] as any).fields[0];
    console.log(definitionBuilder.buildField(fieldDef));
    // const types = typeDefs.map(node => {
    //   const type: GraphQLNamedType = definitionBuilder.buildType(node);
    //   console.log(type);
    // });
    // visit(ast, {
    //   enter(node, key, parent, path) {
    //     // 
    //   },
    // });
    return models;
  }
}
