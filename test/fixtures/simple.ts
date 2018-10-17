import Model from '../../src/dataModel/model';
import ScalarField from '../../src/dataModel/scalarField';
import { GraphqlType } from '../../src/dataModel/type';

export const userModel = new Model({
  name: 'user',
  fields: [
    new ScalarField({name: 'id', type: GraphqlType.ID, unique: true, autoGen: true}),
    new ScalarField({name: 'name', type: GraphqlType.STRING}),
    new ScalarField({name: 'active', type: GraphqlType.BOOLEAN}),
  ],
});
