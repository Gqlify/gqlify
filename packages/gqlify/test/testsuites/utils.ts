import chai from 'chai';
import chaiHttp = require('chai-http');
chai.use(chaiHttp);
import { Gqlify, DataSource } from '../../src';
import Koa from 'koa';
import { ApolloServer } from 'apollo-server-koa';
import http from 'http';
import { GraphQLScalarType } from 'graphql';
import { readFileSync } from 'fs';
import GraphQLJSON from 'graphql-type-json';
import path from 'path';

export const createApp = ({ sdl, dataSources, scalars, }: {
  sdl: string;
  dataSources: Record<string, (args: any) => DataSource>;
  scalars?: Record<string, GraphQLScalarType>;
}) => {
  const gqlify = new Gqlify({sdl, dataSources, scalars});
  const server = new ApolloServer(gqlify.createApolloConfig());
  const app = new Koa();
  server.applyMiddleware({ app });
  const httpServer = http.createServer(app.callback());
  const requester = chai.request(httpServer).keepOpen();

  const graphqlRequest = async (query, variables?) => {
    const request = requester
      .post(server.graphqlPath);

    const res = await request.send({
      operationName: null,
      query,
      variables,
    });

    if (res.body && res.body.errors) {
      // tslint:disable-next-line:no-console
      console.log(JSON.stringify(res.body.errors, null, 2));
      return res.body.errors;
    }

    return res.body.data;
  };

  return {
    graphqlRequest,
    close: () => requester.close(),
  };
};

export const createGqlifyApp = (sdl: string, dataSources: Record<string, any>) => {
  const {graphqlRequest, close} = createApp({
    sdl,
    dataSources,
    scalars: {
      JSON: GraphQLJSON,
    },
  });
  return {graphqlRequest, close};
};

export const prepareConfig = () => {
  let mongoUri: string;
  let serviceAccount: Record<string, any>;

  if (process.env.CI) {
    mongoUri = process.env.TEST_MONGODB_URI;
    serviceAccount = JSON.parse(process.env.TEST_SERVICE_ACCOUNT);
  } else {
    // local dev
    mongoUri = 'mongodb://localhost:27017';
    serviceAccount = JSON.parse(readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'), {encoding: 'utf8'}));
  }

  return {mongoUri, serviceAccount};
};
