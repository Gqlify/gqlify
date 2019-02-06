import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql';
import {
  Model,
  ScalarField as DataScalarField,
  CustomScalarField as DataCustomScalarField,
  EnumField as DataEnumField,
  ObjectField as DataObjectField,
  RelationField as DataRelationField,
  EnumType,
  NamedType,
  ObjectType,
} from './dataModel';
import {
  ObjectField as SdlObjectField,
} from './sdlParser/field';
import RootNode from './rootNode';
import { SdlParser } from './sdlParser/parser';
import { SdlEnumType, SdlObjectType } from './sdlParser/namedType';
import { BasicFieldMiddware, MetadataMiddleware, SdlMiddleware } from './sdlParser/middlewares';
import { SdlField, SdlFieldType } from './sdlParser/field/interface';
import { DataModelType } from './dataModel/type';
import { mapValues, forEach, values, reduce, get } from 'lodash';
import { SdlNamedType } from './sdlParser/namedType/interface';
import {
  MODEL_DIRECTIVE,
  OBJECT_DIRECTIVE,
  RELATION_INTERFACE_NAME,
  RELATION_DIRECTIVE_NAME,
  RELATION_WITH,
} from './constants';
import { InputValue } from './sdlParser/inputValue/interface';

const isGqlifyModel = (sdlNamedType: SdlNamedType) => {
  return Boolean(sdlNamedType.getDirectives()[MODEL_DIRECTIVE]);
};

const isGqlifyObject = (sdlNamedType: SdlNamedType) => {
  return Boolean(sdlNamedType.getDirectives()[OBJECT_DIRECTIVE]);
};

const isRelationType = (sdlObjectType: SdlObjectType) => {
  return Boolean(sdlObjectType.getInterfaces().find(interfaceName => interfaceName === RELATION_INTERFACE_NAME));
};

export const parseDataModelScalarType = (field: SdlField): DataModelType => {
  switch (field.getTypeName()) {
    case GraphQLString.name:
      return DataModelType.STRING;

    case GraphQLInt.name:
      return DataModelType.INT;

    case GraphQLFloat.name:
      return DataModelType.FLOAT;

    case GraphQLBoolean.name:
      return DataModelType.BOOLEAN;

    case GraphQLID.name:
      return DataModelType.ID;

    default:
      throw new Error(`cant parse dataModel type for field type: ${field.getTypeName()}`);
  }
};

export const createDataFieldFromSdlField = (
  field: SdlField,
  getModel: (name: string) => Model,
  getNamedType: (name: string) => NamedType,
  getRelationConfig: (name: string) => Record<string, any>,
) => {
  const fieldMeta = {
    nonNull: field.isNonNull(),
    list: field.isList(),
    nonNullItem: field.isItemNonNull(),
  };
  switch (field.getFieldType()) {
    case SdlFieldType.SCALAR:
      const type = parseDataModelScalarType(field);
      return new DataScalarField({
        type,
        ...fieldMeta,
      });

    case SdlFieldType.CUSTOM_SCALAR:
      return new DataCustomScalarField({
        typename: field.getTypeName(),
        ...fieldMeta,
      });

    case SdlFieldType.ENUM:
      return new DataEnumField({
        enumType: () => getNamedType(field.getTypeName()) as EnumType,
        ...fieldMeta,
      });

    case SdlFieldType.OBJECT:
      const objectField = field as SdlObjectField;
      if (isGqlifyModel(objectField.getObjectType())) {
        const relationWith: string = get(objectField.getDirective(RELATION_DIRECTIVE_NAME), RELATION_WITH);
        return new DataRelationField({
          relationTo: () => getModel(objectField.getTypeName()),
          relationConfig: relationWith ? null : () => getRelationConfig(relationWith),
          ...fieldMeta,
        });
      } else {
        return new DataObjectField({
          objectType: () => getNamedType(field.getTypeName()) as ObjectType,
          ...fieldMeta,
        });
      }
  }
};

const parseRelationConfig = (sdlObjectType: SdlObjectType): Record<string, any> => {
  // parse `type AdminRelation implements Relation @config(name: "name" foreignKey: "key")`
  return mapValues(get(sdlObjectType.getDirectives(), 'config.args'),
    (inputValue: InputValue) => inputValue.getValue());
};

export const createDataModelFromSdlObjectType = (
  sdlObjectType: SdlObjectType,
  getModel: (name: string) => Model,
  getNamedType: (name: string) => NamedType,
  getRelationConfig: (name: string) => Record<string, any>,
  isObject: boolean,
  ): Model => {
  const model = new Model({
    name: sdlObjectType.getName(),
    isObject,
  });

  // append fields
  forEach(sdlObjectType.getFields(), (sdlField, key) => {
    model.appendField(key, createDataFieldFromSdlField(sdlField, getModel, getNamedType, getRelationConfig));
  });
  return model;
};

// use sdlParser to parse sdl to Model & RootNode
export const parse = (sdl: string): {rootNode: RootNode, models: Model[]} => {
  const parser = new SdlParser();
  const sdlNamedTypes = parser.parse(sdl);
  const rootNode = new RootNode();
  const namedTypes: Record<string, NamedType> = {};
  const models: Record<string, Model> = {};
  const relationConfigMap: Record<string, Record<string, any>> = {};
  const getModel = (name: string) => {
    return models[name];
  };

  const getNamedType = (name: string) => {
    return namedTypes[name];
  };

  const getRelationConfig = (name: string) => relationConfigMap[name];

  sdlNamedTypes.forEach(sdlNamedType => {
    const name = sdlNamedType.getName();
    // enum type
    if (sdlNamedType instanceof SdlEnumType) {
      // construct EnumType
      const enumType = new EnumType({
        name,
        values: sdlNamedType.getValues(),
      });
      namedTypes[name] = enumType;
      rootNode.addEnum(enumType);
    }

    // object type
    // not GQLifyModel & RelationType
    if (sdlNamedType instanceof SdlObjectType && !isGqlifyModel(sdlNamedType) && !isRelationType(sdlNamedType)) {
      const objectType = new ObjectType({
        name,
        fields: mapValues(sdlNamedType.getFields(), sdlField => {
          return createDataFieldFromSdlField(sdlField, getModel, getNamedType, getRelationConfig);
        }),
      });
      namedTypes[name] = objectType;
      rootNode.addObjectType(objectType);
    }

    // GQLifyModel || GQLifyObject
    if (sdlNamedType instanceof SdlObjectType && (isGqlifyModel(sdlNamedType) || isGqlifyObject(sdlNamedType))) {
      const isObject = isGqlifyObject(sdlNamedType);
      const model = createDataModelFromSdlObjectType(sdlNamedType, getModel, getNamedType, getRelationConfig, isObject);
      models[name] = model;
    }

    // RelationType
    if (sdlNamedType instanceof SdlObjectType && isRelationType(sdlNamedType)) {
      // parse arguments to relation config
      const relationConfig = parseRelationConfig(sdlNamedType);
      relationConfigMap[name] = relationConfig;
    }
  });

  // go through middlewares
  const middlewares: SdlMiddleware[] = [
    new BasicFieldMiddware(),
    new MetadataMiddleware(),
  ];

  // visit objectType
  forEach(namedTypes, namedType => {
    if (namedType instanceof SdlObjectType) {
      middlewares.forEach(mid => mid.visitObjectType && mid.visitObjectType(namedType));
    }
  });

  // visit model & fields
  forEach(models, (model, key) => {
    const sdlObjectType = parser.getSdlNamedType(key) as SdlObjectType;
    middlewares.forEach(mid =>  mid.visitGqlifyModel && mid.visitGqlifyModel({
      model,
      sdlObjectType,
    }));

    // visit fields
    forEach(model.getFields(), (dataModelField, name) => {
      const sdlField = sdlObjectType.getField(name);
      middlewares.forEach(mid => mid.visitField && mid.visitField({
        model,
        field: dataModelField,
        sdlObjectType,
        sdlField,
      }));
    });
  });

  return {rootNode, models: values(models)};
};
