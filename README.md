## GQLify
[![npm version](https://badge.fury.io/js/%40gqlify%2Fserver.svg)](https://badge.fury.io/js/%40gqlify%2Fserver)

![home](https://i.imgur.com/ojShV9s.png)

Build GraphQL servers with GraphQL SDL.

## Features
* **Easy**: Build GraphQL server with SDL
* **API agnostic**: Support multiple data-sources, including firebase, firestore, mongoDB and more to come.
* **Extensible framework**: custoimize scalar, query, mutation is all possible in GQLify.

## Community & Resources
* [gqlify.com](https://www.gqlify.com/)
* [document](https://www.gqlify.com/docs)
* [gitter](https://gitter.im/Canner/gqlify)

## Installation
``` console
yarn add @gqlify/server
```

## Demo
[![Edit GQLify Server @welcome page](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/p7wqo43zpx)

## Quick start
> [Walk through quickstart in document](https://www.gqlify.com/docs/quick-start)

### Datamodel
Your datamodel file is written in GraphQL SDL (Schema Definition Language)
```graphql
type User @GQLifyModel(dataSource: "memory", key: "users") {
  id: ID! @unique @autoGen
  username: String!
  email: String
  books: [Book!]!
}

type Book @GQLifyModel(dataSource: "memory", key: "books") {
  id: ID! @unique @autoGen
  name: String!
  author: User!
}
```

### Use with apollo-server
```js
const { ApolloServer, gql } = require("apollo-server");
const { Gqlify, MemoryDataSource } = require("@gqlify/server");

// read datamodel
const { readFileSync } = require("fs");
const dataModel = readFileSync("./datamodel.graphql", "utf8");

// Construct GQLify
const gqlify = new Gqlify({
  sdl: dataModel,
  dataSources: {
    memory: () => new MemoryDataSource()
  }
});

const server = new ApolloServer(gqlify.createApolloConfig());

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

