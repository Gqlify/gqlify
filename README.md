## Gqlify
GQLify is a framework help you easily build a GraphQL server on top of existing data-source or APIs.

## Features
* [Declarative data modeling](#data-modeling)
* Auto-generated GraphQL API
* [Support multiple data-source](#data-source)
* [Seamless relation API](#relation)
* Opencrud compatible GraphQL API

## Installation
``` console
yarn add @gqlify/server
```

## Quickstart
``` ts
import { GqlifyServer, MemoryDataSource } from '@gqlify/server';

const dataModel = ```
type User @GQLifyModel(dataSource: "memory", key: "users") {
  id: ID! @unique @autoGen
  username: String!
  email: String
  groups: [Group!]!
}

type Group @GQLifyModel(dataSource: "memory", key: "groups") {
  id: ID! @unique @autoGen
  name: String!
  members: [User!]!
}
```;

const server = new GqlifyServer({
  sdl: dataModel,
  dataSources: {
    memory: (args: any) => new MemoryDataSource({key: args.key}),
  },
});

server.serve();
```

## Data Modeling
The datamodel is written in the GraphQL Schema Definition Language (SDL). It will be used to generate your GraphQL API and construct data-sources.

### Scalar Fields
* STRING
``` graphql
type User {
  name: String
}
```

* INTEGER
``` graphql
type User {
  age: Int
}
```

* BOOLEAN
``` graphql
type User {
  married: Boolean
}
```

* ENUM
``` graphql
enum Status {
  SUCCESS,
  FAILED
}

type Order {
  status: Status
}
```

* ID
```
type User {
  id: ID! @unique
}
```

## Data source
Gqlify will create your data source with function you assigned.
``` ts
const server = new GqlifyServer({
  sdl: dataModel,
  dataSources: {
    // memory data source
    memory: (args: any) => new MemoryDataSource({key: args.key}),
  },
});
```

The argumnets will be passed from SDL `@GQLifyModel` directive to creator function.

``` graphql
type Group @GQLifyModel(dataSource: "memory", key: "groups") {
  id: ID! @unique @autoGen
  name: String!
}
```

## Relation
A relation defines a connection between two types. 

For example, we create a simple bidirectional one-to-many relation between user and article:

``` graphql
type User {
  id: ID! @unique
  articles: [Article!]!
}

type Article {
  id: ID! @unique
  author: User!
}
```
