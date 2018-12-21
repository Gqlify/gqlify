import { ApolloServer } from 'apollo-server';
import GraphQLJSON from 'graphql-type-json';
import { readFileSync } from 'fs';
import { Gqlify } from '../src/gqlify';
import MemoryDataSource from '../src/dataSource/memoryDataSource';
const sdl = `
scalar JSON

enum STATUS {
  OK
  NOT_OK
}

type Location {
  lng: String
  lat: String
}

type Note {
  title: String
  text: String
}

type User @GQLifyModel(dataSource: "memory", key: "users") {
  id: ID! @unique @autoGen
  username: String!
  email: String
  status: STATUS
  attributes: JSON
  location: Location
  note: [Note!]!
  # bi-*-to-* relation
  groups: [Group!]! @relation(name: "Membership")
}

type Group @GQLifyModel(dataSource: "memory", key: "groups") {
  id: ID! @unique @autoGen
  name: String
  # bi-*-to-* relation
  members: [User!]! @relation(name: "Membership")
}
`;

const defaultData = {
  users: [
    {id: '1', username: 'wwwy3y3', email: 'wwwy3y3@gmail.com'},
    {id: '2', username: 'wwwy3y32', email: 'wwwy3y3@canner.io'},
  ],
  books: [
    {id: '1', name: 'book1', author: '1'},
    {id: '2', name: 'book2', author: '2'},
  ],
  groups: [
    {id: '1', name: 'group1'},
    {id: '2', name: 'group2'},
  ],
};

const gqlify = new Gqlify({
  sdl,
  dataSources: {
    memory: (args: any) => new MemoryDataSource(),
  },
  scalars: {
    JSON: GraphQLJSON,
  },
});
const server = new ApolloServer(gqlify.createApolloConfig());

server.listen().then(({ url }) => {
  // tslint:disable-next-line:no-console
  console.log(`🚀 Server ready at ${url}`);
});
