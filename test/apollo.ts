import { readFileSync } from 'fs';
import { GqlifyServer } from '../src';
const sdl = readFileSync('./fixtures/simple.graphql');

const server = new GqlifyServer({
  sdl,
  dataSources: {
    memory: {

    }
  }
})
