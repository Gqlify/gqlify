
<div align="center">

<a href="https://www.gqlify.com"><img src="./resources/logo-pink.svg" width="50%"></a>

</div>

<div align="center">

[![npm version](https://badge.fury.io/js/%40gqlify%2Fserver.svg)](https://badge.fury.io/js/%40gqlify%2Fserver) [![](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/Canner/gqlify?utm_source=share-link&utm_medium=link&utm_campaign=share-link) [![Twitter Follow](https://img.shields.io/twitter/follow/cannerIO.svg?style=social&label=Follow)](https://twitter.com/cannerIO)

</div>
<br/>

> Build GraphQL servers with GraphQL SDL in seconds.

* Official Website: [gqlify.com](https://www.gqlify.com/)


![home](https://i.imgur.com/ojShV9s.png)

## Features
* **Easy**: Build GraphQL server with SDL in seconds
* **API agnostic**: Support multiple data-sources, including Firebase, Firestore, MongoDB and more...
* **Extensible framework**: GQLify will work perfectly without any further complicated configurations, but it also comes with plugins to help you build your own GraphQL queries and mutations. Every part of GQLify is easy to customize, including graphQL APIs and types, data-sources and schema directives.
* **Authentication**: GQLify leverage `graphql-middleware` to let you choose your own authentication flow. It's easy to use GQLify with simple `JWT-token` protection or role-based access control.
* **API protection**: GQLify support rate-limit, request size limiting, circuit breaker, cache-control and authorization to protect your API source. GQLify is working hard on it to make sure your API sources are in good hand.

## Installation
``` console
yarn add @gqlify/server
```

## Demo
[![Edit GQLify Server @welcome page](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/p7wqo43zpx)


👉 [Full documentation](https://www.gqlify.com/docs)

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

## License

Apache-2.0

![footer banner](https://user-images.githubusercontent.com/26116324/37811196-a437d930-2e93-11e8-97d8-0653ace2a46d.png)
