import Model from '../../src/dataModel/model';
import ScalarField from '../../src/dataModel/scalarField';
import { DataModelType } from '../../src/dataModel/type';
import ObjectField from '../../src/dataModel/objectField';
import RelationField from '../../src/dataModel/relationField';
import { DataSource, Operator } from '../../src/dataSource/interface';

interface Context {
  dataSources: {
    userApi: DataSource;
    bookApi: DataSource;
    groupApi: DataSource;
  };
}

export const userModel = new Model({
  name: 'user',
  fields: {
    id: new ScalarField({type: DataModelType.ID, unique: true, autoGen: true}),
    username: new ScalarField({type: DataModelType.STRING}),
    email: new ScalarField({type: DataModelType.STRING}),
  },
});

export const bookModel = new Model({
  name: 'book',
  fields: {
    id: new ScalarField({type: DataModelType.ID, unique: true, autoGen: true}),
    name: new ScalarField({type: DataModelType.STRING}),
  },
});

export const groupModel = new Model({
  name: 'group',
  fields: {
    id: new ScalarField({type: DataModelType.ID, unique: true, autoGen: true}),
    name: new ScalarField({type: DataModelType.STRING}),
  },
});

// relation
// user-book: one-to-many
userModel.appendField('books', new RelationField({
  list: true,
  relationTo: bookModel,
}));
userModel.setFieldResolver('books', async (parent: any, args, context: Context) => {
  const response = await context.dataSources.bookApi.find({where: {author: {[Operator.eq]: parent.id}}});
  return response.data;
});

bookModel.appendField('author', new RelationField({
  relationTo: userModel,
}));
bookModel.setFieldResolver('author', async (parent: any, args, context: Context) => {
  return context.dataSources.userApi.findOne(parent.author);
});

// user-group: many-to-many
userModel.appendField('groups', new RelationField({
  list: true,
  relationTo: groupModel,
}));
userModel.setFieldResolver('groups', async (parent: any, args, context: Context) => {
  const response = await context.dataSources.groupApi.find();
  return response.data.filter(group => group.members && group.members.indexOf(parent.id) >= 0);
});

groupModel.appendField('members', new RelationField({
  list: true,
  relationTo: userModel,
}));
groupModel.setFieldResolver('members', async (parent: any, args, context: Context) => {
  const ids = parent.members;
  return Promise.all(ids.map(id => context.dataSources.userApi.findOne({where: {id: {[Operator.eq]: id}}})));
});
