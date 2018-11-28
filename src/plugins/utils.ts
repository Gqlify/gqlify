import Field from '../dataModel/field';
import { Context } from './interface';
import EnumField from '../dataModel/enumField';
import ObjectField from '../dataModel/objectField';
import { upperFirst, forEach } from 'lodash';

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

export const recursiveCreateType = (fields: Record<string, Field>, context: Context): string[] => {
  const { root } = context;
  const content: string[] = [];
  forEach(fields, (field, name) => {
    if (field instanceof EnumField) {
      root.addEnum(`enum ${field.getTypename()} {${field.getValues().join(',')}}`);
    }

    if (field instanceof ObjectField) {
      // create type for nested object
      const typeFields = recursiveCreateType(field.getFields(), context);
      const objectTypename = upperFirst(name);
      root.addObjectType(`type ${objectTypename} {${typeFields.join(' ')}}`);
    }

    content.push(`${name}: ${graphqlType(field)}`);
  });

  return content;
};

// export const getInputNameFromObjectType
