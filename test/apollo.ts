import { readFileSync } from 'fs';
import { GqlifyServer } from '../src';
import MemoryDataSource from './mock/memoryDataSource';
const sdl = readFileSync(__dirname + '/fixtures/simple.graphql', {encoding: 'utf8'});

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

const server = new GqlifyServer({
  sdl,
  dataSources: {
    memory: (args: any) => new MemoryDataSource(defaultData[args.key]),
  },
});

server.serve();
