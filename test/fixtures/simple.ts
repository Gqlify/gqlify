import Model from '../../src/dataModel/model';
import ScalarField from '../../src/dataModel/scalarField';
import { GraphqlType } from '../../src/dataModel/type';
import ObjectField from '../../src/dataModel/objectField';

export const userModel = new Model({
  name: 'user',
  fields: [
    new ScalarField({name: 'id', type: GraphqlType.ID, unique: true, autoGen: true}),
    new ScalarField({name: 'name', type: GraphqlType.STRING}),
    new ScalarField({name: 'active', type: GraphqlType.BOOLEAN}),
    new ObjectField({
      name: 'attributes',
      fields: [
        new ScalarField({name: 'attr1', type: GraphqlType.STRING}),
        new ScalarField({name: 'attr2', type: GraphqlType.INT}),
      ],
    }),
  ],
});
