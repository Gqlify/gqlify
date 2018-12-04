/**
 * OneModel is for simple CRUD test
 */
import chai from 'chai';
import chaiHttp = require('chai-http');
chai.use(chaiHttp);
import { readFileSync } from 'fs';
import GraphQLJSON from 'graphql-type-json';
import MemoryDataSource from '../src/dataSource/memoryDataSource';
import faker from 'faker';
import { createApp } from './createApp';
import { times } from 'lodash';

const expect = chai.expect;
const sdl = readFileSync(__dirname + '/fixtures/oneToOne.graphql', {encoding: 'utf8'});

const userFields = `
  id
  username
  email
  status
  attributes
  location {
    lat
    lng
  }
  note {
    title
    text
  }
`;

const bookFields = `
  id
  name
  author {
    ${userFields}
  }
`;

const teamFields = `
  id
  name
  onePlayer {
    ${userFields}
  }
`;

const fakeUserData = (data?: any) => {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    status: 'OK',
    attributes: {x: 1},
    location: {
      lat: faker.address.latitude(),
      lng: faker.address.longitude(),
    },
    note: [{title: faker.lorem.slug(10), text: faker.lorem.sentence(100)}],
    ...data,
  };
};

describe('Relation tests on fixtures/oneToOne.graphql', function() {
  before(async () => {
    const {graphqlRequest, close} = createApp({
      sdl,
      dataSources: {
        memory: () => new MemoryDataSource(),
      },
      scalars: {
        JSON: GraphQLJSON,
      },
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
  });

  after(async () => {
    await (this as any).close();
  });

  it('should create with uni-1-to-1', async () => {
    const variables = {
      data: fakeUserData(),
    };

    const query = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(query, variables);

    // create with to-one relation
    const createRelationQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const {createTeam} = await (this as any).graphqlRequest(
      createRelationQuery,
      {
        data: {
          name: faker.internet.userName(),
          onePlayer: {
            connect: {id: createUser.id},
          },
        },
      });
    console.log(createTeam);
  });

  it('should connect with uni-1-to-1');
  it('should disconnect with uni-1-to-1');

  it('should create with bi-1-to-1 from one side');
  it('should connect with bi-1-to-1 from one side');
  it('should disconnect with bi-1-to-1 from one side');

  it('should create with bi-1-to-1 from the other side');
  it('should connect with bi-1-to-1 from the other side');
  it('should disconnect with bi-1-to-1 from the other side');
});
