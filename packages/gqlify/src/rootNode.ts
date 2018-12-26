import { values, reduce, isString, keyBy, isPlainObject, isEmpty, concat, mapValues } from 'lodash';
import {
  GraphQLFieldConfig,
  parse,
  FieldDefinitionNode,
  NamedTypeNode,
  TypeDefinitionNode,
  GraphQLNamedType,
  GraphQLUnionTypeConfig,
  GraphQLEnumTypeConfig,
  GraphQLObjectTypeConfig,
  GraphQLInputObjectTypeConfig,
  GraphQLScalarTypeConfig,
  GraphQLInterfaceTypeConfig,
  getDescription,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  EnumTypeDefinitionNode,
  UnionTypeDefinitionNode,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLInputObjectType,
  printSchema,
  print,
  Kind,
  TypeNode,
  NonNullTypeNode,
  ListTypeNode
} from 'graphql';
import { ObjectType, NamedType, EnumType } from './dataModel';
import Field from './dataModel/field';
import { compose } from 'lodash/fp';
import { IResolverObject } from 'graphql-tools';
// tslint:disable-next-line:no-var-requires
const { ASTDefinitionBuilder } = require('graphql/utilities/buildASTSchema');

const buildTypeNodeFromField = (field: Field): TypeNode => {
  const wrapped: Array<(node: TypeNode) => TypeNode> = [];
  if (field.isNonNull()) {
    wrapped.push(node => {
      // tslint:disable-next-line:no-object-literal-type-assertion
      return {
        kind: Kind.NON_NULL_TYPE,
        type: node,
      } as NonNullTypeNode;
    });
  }

  if (field.isList()) {
    wrapped.push(node => {
      // tslint:disable-next-line:no-object-literal-type-assertion
      return {
        kind: Kind.LIST_TYPE,
        type: node,
      } as ListTypeNode;
    });

    if (field.isNonNullItem()) {
      wrapped.push(node => {
        // tslint:disable-next-line:no-object-literal-type-assertion
        return {
          kind: Kind.NON_NULL_TYPE,
          type: node,
        } as NonNullTypeNode;
      });
    }
  }

  const typeNode: NamedTypeNode = {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: field.getTypename(),
    },
  };
  return compose(wrapped)(typeNode);
};

export default class RootNode {
  private defBuilder: any;
  private resolvers: IResolverObject = {};
  // todo: figure out GraphQLFieldConfig general type
  private queryMap: Record<string, () => GraphQLFieldConfig<any, any>> = {};
  private mutationMap: Record<string, () => GraphQLFieldConfig<any, any>> = {};
  private objectTypeMap: Record<string, GraphQLObjectTypeConfig<any, any>> = {};
  private inputMap: Record<string, GraphQLInputObjectTypeConfig> = {};
  private scalars: GraphQLScalarType[] = [];
  private interfaceMap: Record<string, GraphQLInterfaceTypeConfig<any, any>> = {};
  private enumMap: Record<string, GraphQLEnumTypeConfig> = {};
  private unionMap: Record<string, GraphQLUnionTypeConfig<any, any>> = {};

  constructor() {
    this.defBuilder = new ASTDefinitionBuilder({}, {}, typeRef => {
      throw new Error(`Type "${typeRef.name.value}" not found in document.`);
    });
  }

  /**
   * Resolver related
   */

  public addResolver(resolverObject: IResolverObject) {
    this.resolvers = {
      ...this.resolvers,
      ...resolverObject,
    };
  }

  public getResolvers() {
    return this.resolvers;
  }

  /**
   * GraphQL API related
   */

  // query could be queryName(args): type, or a GraphQLFieldConfig
  public addQuery(query: string | {name: string, field: () => GraphQLFieldConfig<any, any>}) {
    const {name, field} = isPlainObject(query)
      ? query as {name: string, field: () => GraphQLFieldConfig<any, any>}
      : this.buildField(query as string);
    this.queryMap[name] = field;
  }

  // mutation could be mutationName(args): type, or a GraphQLFieldConfig
  public addMutation(mutation: string | {name: string, field: () => GraphQLFieldConfig<any, any>}) {
    const {name, field} = isPlainObject(mutation)
      ? mutation as {name: string, field: () => GraphQLFieldConfig<any, any>}
      : this.buildField(mutation as string);
    this.mutationMap[name] = field;
  }

  public addObjectType(type: string | ObjectType) {
    const {name, def} = this.buildObjectType(type);
    this.objectTypeMap[name] = this.buildObjectTypeConfig(def);
  }

  public addInput(input: string | InputObjectTypeDefinitionNode) {
    const {name, def} = this.buildType<InputObjectTypeDefinitionNode>(input);
    this.inputMap[name] = this.buildInputTypeConfig(def);
  }

  public addScalar(scalar: GraphQLScalarType) {
    this.scalars.push(scalar);
  }

  public addInterface(interfaceDef: string) {
    const {name, def} = this.buildType<InterfaceTypeDefinitionNode>(interfaceDef);
    this.interfaceMap[name] = this.buildInterfaceTypeConfig(def);
  }

  public addEnum(enumDef: string | EnumType) {
    const {name, def} = this.buildEnumType(enumDef);
    this.enumMap[name] = this.buildEnumTypeConfig(def);
  }

  public addUnion(unionDef: string | UnionTypeDefinitionNode) {
    const {name, def} = this.buildType<UnionTypeDefinitionNode>(unionDef);
    this.unionMap[name] = this.buildUnionTypeConfig(def);
  }

  public buildSchema() {
    const operationTypes = {
      query: isEmpty(this.queryMap) ? null : new GraphQLObjectType({
        name: 'Query',
        fields: () => mapValues(this.queryMap, field => field()),
      }),
      mutation: isEmpty(this.mutationMap) ? null : new GraphQLObjectType({
        name: 'Mutation',
        fields: () => mapValues(this.mutationMap, field => field()),
      }),
    };

    const scalarDefs = this.scalars;
    const interfaceDefs = values<GraphQLInterfaceTypeConfig<any, any>>(this.interfaceMap)
      .map(typeConfig => new GraphQLInterfaceType(typeConfig));
    const enumDefs = values<GraphQLEnumTypeConfig>(this.enumMap)
      .map(typeConfig => new GraphQLEnumType(typeConfig));
    const unionDefs = values<GraphQLUnionTypeConfig<any, any>>(this.unionMap)
      .map(typeConfig => new GraphQLUnionType(typeConfig));
    const objectTypeDefs = values<GraphQLObjectTypeConfig<any, any>>(this.objectTypeMap)
      .map(typeConfig => new GraphQLObjectType(typeConfig));
    const inputTypeDefs = values<GraphQLInputObjectTypeConfig>(this.inputMap)
      .map(typeConfig => new GraphQLInputObjectType(typeConfig));
    const typeDefs: GraphQLNamedType[] =
      concat<GraphQLNamedType>(scalarDefs, interfaceDefs, enumDefs, unionDefs, objectTypeDefs, inputTypeDefs);
    typeDefs.forEach(type => {
      this.defBuilder._cache[type.name] = type;
    });
    return new GraphQLSchema({
      query: operationTypes.query,
      mutation: operationTypes.mutation,
      types: typeDefs,
    });
  }

  public print() {
    const schema = this.buildSchema();
    return printSchema(schema);
  }

  private buildField(field: string): {name: string, field: () => GraphQLFieldConfig<any, any>} {
    // todo: find a better way to parse FieldDefinitionNode
    const fieldDef: FieldDefinitionNode = (parse(`type name {${field}}`).definitions[0] as any).fields[0];
    return {
      name: fieldDef.name.value,
      field: () => this.defBuilder.buildField(fieldDef),
    };
  }

  private buildObjectTypeConfig(typeDef: ObjectTypeDefinitionNode): GraphQLObjectTypeConfig<any, any> {
    const interfaces: NamedTypeNode[] = typeDef.interfaces;
    return {
      name: typeDef.name.value,
      description: getDescription(typeDef, {}),
      fields: () => this.defBuilder._makeFieldDefMap(typeDef),
      // Note: While this could make early assertions to get the correctly
      // typed values, that would throw immediately while type system
      // validation with validateSchema() will produce more actionable results.
      interfaces: interfaces
        ? () => interfaces.map(ref => this.defBuilder.buildType(ref))
        : [],
      astNode: typeDef,
    };
  }

  private buildInputTypeConfig(def: InputObjectTypeDefinitionNode): GraphQLInputObjectTypeConfig {
    return {
      name: def.name.value,
      description: getDescription(def, {}),
      fields: () => def.fields ? this.defBuilder._makeInputValues(def.fields) : {},
      astNode: def,
    };
  }

  private buildInterfaceTypeConfig(def: InterfaceTypeDefinitionNode): GraphQLInterfaceTypeConfig<any, any> {
    return {
      name: def.name.value,
      description: getDescription(def, {}),
      fields: () => this.defBuilder._makeFieldDefMap(def),
      astNode: def,
    };
  }

  private buildEnumTypeConfig(def: EnumTypeDefinitionNode): GraphQLEnumTypeConfig {
    return {
      name: def.name.value,
      description: getDescription(def, {}),
      values: this.defBuilder._makeValueDefMap(def),
      astNode: def,
    };
  }

  private buildUnionTypeConfig(def: UnionTypeDefinitionNode): GraphQLUnionTypeConfig<any, any> {
    const types: NamedTypeNode[] = def.types;
    return {
      name: def.name.value,
      description: getDescription(def, {}),
      // Note: While this could make assertions to get the correctly typed
      // values below, that would throw immediately while type system
      // validation with validateSchema() will produce more actionable results.
      types: types ? () => types.map(ref => (this.defBuilder.buildType(ref) as any)) : [],
      astNode: def,
    };
  }

  private buildType<TypeDefType = TypeDefinitionNode>(typeDef: string | TypeDefType): {name: string, def: TypeDefType} {
    const typeDefNode = isString(typeDef)
      ? parse(typeDef as string).definitions[0] as any
      : typeDef;
    const name = typeDefNode.name.value;
    this.defBuilder._typeDefinitionsMap[name] = typeDefNode;
    return {name, def: typeDefNode};
  }

  private buildObjectType(typeDef: string | ObjectType): {name: string, def: ObjectTypeDefinitionNode} {
    const typeDefNode: ObjectTypeDefinitionNode = isString(typeDef)
      ? parse(typeDef as string).definitions[0] as ObjectTypeDefinitionNode
      : {
        kind: Kind.OBJECT_TYPE_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: typeDef.getTypename(),
        },
        fields: reduce(typeDef.getFields(), (arr, field, key) => {
          arr.push({
            kind: Kind.FIELD_DEFINITION,
            name: {
              kind: Kind.NAME,
              value: key,
            },
            type: buildTypeNodeFromField(field),
          });
          return arr;
        }, []),
      };
    const name = typeDefNode.name.value;
    this.defBuilder._typeDefinitionsMap[name] = typeDefNode;
    return {name, def: typeDefNode};
  }

  private buildEnumType(typeDef: string | EnumType): {name: string, def: EnumTypeDefinitionNode} {
    const typeDefNode: EnumTypeDefinitionNode = isString(typeDef)
      ? parse(typeDef as string).definitions[0] as EnumTypeDefinitionNode
      : {
        kind: Kind.ENUM_TYPE_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: typeDef.getTypename(),
        },
        values: typeDef.getValues().map(value => {
          return {
            kind: Kind.ENUM_VALUE_DEFINITION,
            name: {
              kind: Kind.NAME,
              value,
            },
          };
        }),
      };
    const name = typeDefNode.name.value;
    this.defBuilder._typeDefinitionsMap[name] = typeDefNode;
    return {name, def: typeDefNode};
  }
}
