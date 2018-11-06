import { Context } from './plugins/interface';
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
  print
} from 'graphql';
// tslint:disable-next-line:no-var-requires
const { ASTDefinitionBuilder } = require('graphql/utilities/buildASTSchema');

export default class RootNode {
  private defBuilder: any;
  // todo: figure out GraphQLFieldConfig general type
  private queryMap: Record<string, () => GraphQLFieldConfig<any, any>> = {};
  private mutationMap: Record<string, () => GraphQLFieldConfig<any, any>> = {};
  private objectTypeMap: Record<string, GraphQLObjectTypeConfig<any, any>> = {};
  private inputMap: Record<string, GraphQLInputObjectTypeConfig> = {};
  private scalarMap: Record<string, GraphQLScalarTypeConfig<any, any>> = {};
  private interfaceMap: Record<string, GraphQLInterfaceTypeConfig<any, any>> = {};
  private enumMap: Record<string, GraphQLEnumTypeConfig> = {};
  private unionMap: Record<string, GraphQLUnionTypeConfig<any, any>> = {};

  constructor() {
    this.defBuilder = new ASTDefinitionBuilder({}, {}, typeRef => {
      throw new Error(`Type "${typeRef.name.value}" not found in document.`);
    });
  }

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

  public addObjectType(typeDef: string | ObjectTypeDefinitionNode) {
    const {name, def} = this.buildType<ObjectTypeDefinitionNode>(typeDef);
    this.objectTypeMap[name] = this.buildObjectTypeConfig(def);
  }

  public addInput(input: string | InputObjectTypeDefinitionNode) {
    const {name, def} = this.buildType<InputObjectTypeDefinitionNode>(input);
    this.inputMap[name] = this.buildInputTypeConfig(def);
  }

  public addScalar(name: string, scalar: GraphQLScalarType) {
    this.scalarMap[name] = scalar;
  }

  public addInterface(interfaceDef: string) {
    const {name, def} = this.buildType<InterfaceTypeDefinitionNode>(interfaceDef);
    this.interfaceMap[name] = this.buildInterfaceTypeConfig(def);
  }

  public addEnum(enumDef: string | EnumTypeDefinitionNode) {
    const {name, def} = this.buildType<EnumTypeDefinitionNode>(enumDef);
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

    const scalarDefs = values<GraphQLScalarTypeConfig<any, any>>(this.scalarMap)
      .map(typeConfig => new GraphQLScalarType(typeConfig));
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
}
