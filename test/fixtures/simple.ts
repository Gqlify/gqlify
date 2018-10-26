import Model from '../../src/dataModel/model';
import ScalarField from '../../src/dataModel/scalarField';
import { GraphqlType } from '../../src/dataModel/type';
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
  fields: [
    new ScalarField({name: 'id', type: GraphqlType.ID, unique: true, autoGen: true}),
    new ScalarField({name: 'username', type: GraphqlType.STRING}),
    new ScalarField({name: 'email', type: GraphqlType.STRING}),
  ],
});

export const bookModel = new Model({
  name: 'book',
  fields: [
    new ScalarField({name: 'id', type: GraphqlType.ID, unique: true, autoGen: true}),
    new ScalarField({name: 'name', type: GraphqlType.STRING}),
  ],
});

export const groupModel = new Model({
  name: 'group',
  fields: [
    new ScalarField({name: 'id', type: GraphqlType.ID, unique: true, autoGen: true}),
    new ScalarField({name: 'name', type: GraphqlType.STRING}),
  ],
});

// relation
// user-book: one-to-many
userModel.appendField(new RelationField({
  name: 'books',
  list: true,
  relationTo: bookModel,
}));
userModel.setFieldResolver('books', async (parent: any, args, context: Context) => {
  const response = await context.dataSources.bookApi.find({where: {author: {[Operator.eq]: parent.id}}});
  return response.data;
});

bookModel.appendField(new RelationField({
  name: 'author',
  relationTo: userModel,
}));
bookModel.setFieldResolver('author', async (parent: any, args, context: Context) => {
  return context.dataSources.userApi.findOne(parent.author);
});

// user-group: many-to-many
userModel.appendField(new RelationField({
  name: 'groups',
  list: true,
  relationTo: groupModel,
}));
userModel.setFieldResolver('groups', async (parent: any, args, context: Context) => {
  const response = await context.dataSources.groupApi.find();
  return response.data.filter(group => group.members && group.members.indexOf(parent.id) >= 0);
});

groupModel.appendField(new RelationField({
  name: 'members',
  list: true,
  relationTo: userModel,
}));
groupModel.setFieldResolver('members', async (parent: any, args, context: Context) => {
  const ids = parent.members;
  return Promise.all(ids.map(id => context.dataSources.userApi.findOne({where: {id: {[Operator.eq]: id}}})));
});
