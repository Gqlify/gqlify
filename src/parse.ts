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
  ScalarField as SdlScalarField,
  CustomScalarField as SdlCustomScalarField,
  EnumField as SdlEnumField,
  ObjectField as SdlObjectField,
} from './sdlParser/field';
import RootNode from './RootNode';
import { SdlParser } from './sdlParser/parser';
import { SdlEnumType, SdlObjectType } from './sdlParser/namedType';
import { BasicFieldMiddware, MetadataMiddleware, SdlMiddleware } from './sdlParser/middlewares';
import Field from './dataModel/field';
import { SdlField, SdlFieldType } from './sdlParser/field/interface';
import { DataModelType } from './dataModel/type';
import { mapValues, forEach, values } from 'lodash';
import { SdlNamedType } from './sdlParser/namedType/interface';
import { MODEL_DIRECTIVE } from './constants';

const isGqlifyModel = (sdlNamedType: SdlNamedType) => {
  return Boolean(sdlNamedType.getDirectives()[MODEL_DIRECTIVE]);
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
  ) => {
  switch (field.getFieldType()) {
    case SdlFieldType.SCALAR:
      const type = parseDataModelScalarType(field);
      return new DataScalarField({
        type,
      });

    case SdlFieldType.CUSTOM_SCALAR:
      return new DataCustomScalarField({
        typename: field.getTypeName(),
      });

    case SdlFieldType.ENUM:
      return new DataEnumField({
        enumType: () => getNamedType(field.getTypeName()) as EnumType,
      });

    case SdlFieldType.OBJECT:
      const objectField = field as SdlObjectField;
      if (isGqlifyModel(objectField.getObjectType())) {
        return new DataRelationField({
          relationTo: () => getModel(objectField.getTypeName()),
        });
      } else {
        return new DataObjectField({
          objectType: () => getNamedType(field.getTypeName()) as ObjectType,
        });
      }
  }
};

export const createDataModelFromSdlObjectType = (
  sdlObjectType: SdlObjectType,
  getModel: (name: string) => Model,
  getNamedType: (name: string) => NamedType,
  ): Model => {
  const model = new Model({
    name: sdlObjectType.getName(),
  });

  // append fields
  forEach(sdlObjectType.getFields(), (sdlField, key) => {
    model.appendField(key, createDataFieldFromSdlField(sdlField, getModel, getNamedType));
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
  const getModel = (name: string) => {
    return models[name];
  };

  const getNamedType = (name: string) => {
    return namedTypes[name];
  };

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
    if (sdlNamedType instanceof SdlObjectType && !isGqlifyModel(sdlNamedType)) {
      const objectType = new ObjectType({
        name,
        fields: mapValues(sdlNamedType.getFields(), sdlField => {
          return createDataFieldFromSdlField(sdlField, getModel, getNamedType);
        }),
      });
      namedTypes[name] = objectType;
      rootNode.addObjectType(objectType);
    }

    // GqlifyModel
    if (sdlNamedType instanceof SdlObjectType && isGqlifyModel(sdlNamedType)) {
      const model = createDataModelFromSdlObjectType(sdlNamedType, getModel, getNamedType);
      models[name] = model;
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
