
## GQLify
[![npm version](https://badge.fury.io/js/%40gqlify%2Fserver.svg)](https://badge.fury.io/js/%40gqlify%2Fserver)
[![](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/Canner/gqlify?utm_source=share-link&utm_medium=link&utm_campaign=share-link)
[![Twitter Follow](https://img.shields.io/twitter/follow/cannerIO.svg?style=social&label=Follow)](https://twitter.com/cannerIO)

> Build GraphQL servers with GraphQL SDL.

![home](https://i.imgur.com/ojShV9s.png)

## Features
* **Easy**: Build GraphQL server with SDL
* **API agnostic**: Support multiple data-sources, including Firebase, Firestore, MongoDB and more...
* **Extensible framework**: custoimize scalar, query, mutation is all possible in GQLify.

## Community & Resources
* [gqlify.com](https://www.gqlify.com/)
* [document](https://www.gqlify.com/docs)

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

