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
const sdl = readFileSync(__dirname + '/fixtures/oneModel.graphql', {encoding: 'utf8'});

const fields = `
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

describe('Tests on fixtures/oneModel.graphql', function() {
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

  testSuits.call(this);
});

function testSuits() {
  it('should respond empty array', async () => {
    const listQuery = `
      query {
        users {${fields}}
      }
    `;
    const {users} = await (this as any).graphqlRequest(listQuery);
    expect(users).to.be.eql([]);
  });

  it('should create record', async () => {
    const variables = {
      data: fakeUserData(),
    };

    const query = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(query, variables);
    expect(createUser).to.have.property('id');
    expect(createUser).to.deep.include(variables.data);

    // query to see if exists
    const {users: createdUsers} = await (this as any).graphqlRequest(`
      query {
        users {${fields}}
      }
    `);
    expect(createdUsers[0]).to.deep.equal(createUser);

    // query one
    const {user} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "${createUser.id}"}) {${fields}}
      }
    `);
    expect(user).to.deep.equal(createUser);
  });

  it('should create many records to test where & pagination filter', async () => {
    // create 20 users, make 10 of them having status NOT_OK
    const createdUsers = await Promise.all(
      times(20, index => {
        const data = index < 10 ? fakeUserData({status: 'NOT_OK'}) : fakeUserData();
        return data;
      })
      .map(userData => {
        const variables = {
          data: userData,
        };

        const query = `
          mutation ($data: UserCreateInput!) {
            createUser (data: $data) {${fields}}
          }
        `;
        return (this as any).graphqlRequest(query, variables)
          .then(res => res.createUser);
    }));

    // find user with id: 5
    const expectCertainUser = createdUsers.find(user => user.id === '5');
    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "5"}) {${fields}}
      }
    `);
    expect(certainUser).to.deep.equal(expectCertainUser);

    // find users with status NOT_OK
    const expectedNotOkUsers = createdUsers.filter(user => user.status === 'NOT_OK');
    const {users: notOkUsers} = await (this as any).graphqlRequest(`
      query {
        users(where: {status: NOT_OK}) {${fields}}
      }
    `);
    expect(notOkUsers).to.have.deep.members(expectedNotOkUsers);

    // paginate users without where
    const first = 5;
    const after = '0';

    // we already created one user in previous test
    const expectedPageUsers = createdUsers.slice(0, first);
    const {users: pageUsers} = await (this as any).graphqlRequest(`
      query {
        users(first: ${first}, after: "${after}") {${fields}}
      }
    `);
    expect(pageUsers).to.have.deep.members(expectedPageUsers);
    expect(pageUsers.length).to.be.equal(expectedPageUsers.length);

    // paginate users with where
    const last = 3;
    const before = '6';
    const expectedPageUsersWithWhere = createdUsers
      .filter(user => user.status === 'NOT_OK')
      .slice(2, createdUsers.findIndex(user => user.id === before));
    const {users: pageUsersWithWhere} = await (this as any).graphqlRequest(`
      query {
        users(last: ${last}, before: "${before}") {${fields}}
      }
    `);
    expect(pageUsersWithWhere).to.have.deep.members(expectedPageUsersWithWhere);
    expect(pageUsersWithWhere.length).to.be.equal(expectedPageUsersWithWhere.length);
  });

  it('should update', async () => {
    const variables = {
      data: {
        username: faker.internet.userName(),
      },
    };
    const query = `
      mutation ($data: UserUpdateInput!) {
        updateUser (where: {id: "1"}, data: $data) { id }
      }
    `;
    const {updateUser} = await (this as any).graphqlRequest(query, variables);
    expect(updateUser.id).to.be.equal('1');

    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "1"}) {${fields}}
      }
    `);
    expect(certainUser.username).to.deep.equal(variables.data.username);
  });

  it('should delete', async () => {
    const query = `
      mutation {
        deleteUser (where: {id: "1"}) { id }
      }
    `;
    const {deleteUser} = await (this as any).graphqlRequest(query);
    expect(deleteUser.id).to.be.equal('1');

    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "1"}) {${fields}}
      }
    `);
    // tslint:disable-next-line:no-unused-expression
    expect(certainUser).to.be.null;
  });
}
