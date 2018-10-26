// test
import { ApolloServer, gql } from 'apollo-server';

// plugins
import BaseTypePlugin from '../src/plugins/baseType';
import WhereInputPlugin from '../src/plugins/whereInput';
import QueryPlugin from '../src/plugins/query';
import CreatePlugin from '../src/plugins/create';
import UpdatePlugin from '../src/plugins/update';
import DeletePlugin from '../src/plugins/delete';
import Generator from '../src/generator';
import combine from '../src/resolver/combine';

// fixtures
import { userModel, bookModel, groupModel } from './fixtures/simple';
import { userApi, bookApi, groupApi } from './mock/simple';

const plugins = [
  new BaseTypePlugin(),
  new WhereInputPlugin(),
  new QueryPlugin(),
  new CreatePlugin(),
  new UpdatePlugin(),
  new DeletePlugin(),
];

userModel.setDataSource(userApi);
bookModel.setDataSource(bookApi);
groupModel.setDataSource(groupApi);
const models = [userModel, bookModel, groupModel];
const generator = new Generator({ plugins });
const resolvers = combine(plugins, models);

// The GraphQL schema
const typeDefs = gql(generator.generate(models));

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => {
    return {
      dataSources: {
        userApi,
        bookApi,
        groupApi,
      },
    };
  },
});

server.listen().then(({ url }) => {
  // tslint:disable-next-line:no-console
  console.log(`🚀 Server ready at ${url}`);
});
