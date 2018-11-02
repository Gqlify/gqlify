import Field from '../dataModel/field';
import { Context } from './interface';
import CustomScalarField from '../dataModel/customScalarField';
import EnumField from '../dataModel/enumField';
import ObjectField from '../dataModel/objectField';
import RelationField from '../dataModel/relationField';
import { upperFirst } from 'lodash';

const graphqlType = (field: Field) => {
  let value = field.getTypename();

  if (field.isList()) {
    value = field.isNonNullItem() ? `[${value}!]` : `[${value}]`;
  }

  if (field.isNonNull()) {
    value = `${value}!`;
  }
  return value;
};

export const recursiveCreateType = (fields: Field[], context: Context): string[] => {
  const { root } = context;
  const content: string[] = [];
  fields.forEach(field => {
    if (field instanceof CustomScalarField) {
      root.addScalar(field.getTypename());
    }

    if (field instanceof EnumField) {
      root.addEnum(`enum ${field.getTypename()} {${field.getValues().join(',')}}`);
    }

    if (field instanceof ObjectField) {
      // create type for nested object
      const typeFields = recursiveCreateType(field.getFields(), context);
      const objectTypename = upperFirst(field.getName());
      root.addObjectType(`type ${objectTypename} {${typeFields.join(' ')}}`);
    }

    content.push(`${field.getName()}: ${graphqlType(field)}`);
  });

  return content;
};
