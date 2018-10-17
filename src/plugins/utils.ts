import Field from '../dataModel/field';
import { Context } from './interface';
import CustomScalarField from '../dataModel/customScalarField';
import EnumField from '../dataModel/enumField';
import ObjectField from '../dataModel/objectField';
import RelationField from '../dataModel/relationField';
import { upperFirst } from 'lodash';

export const recursiveCreateType = (fields: Field[], context: Context): string[] => {
  const { root } = context;
  const content: string[] = [];
  fields.forEach(field => {
    if (field instanceof CustomScalarField) {
      root.addScalar(field.getTypename());
    }

    if (field instanceof EnumField) {
      root.addEnum(field.getTypename(), field.getValues());
    }

    if (field instanceof ObjectField) {
      // create type for nested object
      const typeFields = recursiveCreateType(field.getFields(), context);
      const objectTypename = upperFirst(field.getName());
      root.addType(objectTypename, `type ${objectTypename} {${typeFields.join(' ')}}`);
    }

    content.push(`${field.getName()}: ${field.getTypename()}`);
  });

  return content;
};
