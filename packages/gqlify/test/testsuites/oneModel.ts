import chai from 'chai';
import faker from 'faker';
import { readFileSync } from 'fs';
import path from 'path';
import { times, first as _first, last as _last } from 'lodash';
import { wrapSetToArrayField } from './utils';

const expect = chai.expect;

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

const relayFields = `
  pageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
  edges {
    cursor
    node {
      ${fields}
    }
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

export const sdl = readFileSync(path.resolve(__dirname, '../fixtures/oneModel.graphql'), {encoding: 'utf8'});

export function testSuits() {
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
    const data = fakeUserData();
    const variables = {
      data: wrapSetToArrayField(data),
    };

    const query = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(query, variables);
    expect(createUser).to.have.property('id');
    expect(createUser).to.deep.include(data);

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

  it('should create record with args', async () => {
    const userData = {
      username: 'wwwy3y3',
      email: 'wwwy3y3@canner.io',
    };
    const query = `
      mutation {
        createUser (data: {username: "${userData.username}", email: "${userData.email}"}) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(query);
    expect(createUser).to.have.property('id');
    expect(createUser).to.deep.include(userData);

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
    await Promise.all(
      times(20, index => {
        const data = index < 10 ? fakeUserData({status: 'NOT_OK'}) : fakeUserData();
        return data;
      })
      .map(userData => {
        const variables = {
          data: wrapSetToArrayField(userData),
        };

        const query = `
          mutation ($data: UserCreateInput!) {
            createUser (data: $data) {${fields}}
          }
        `;
        return (this as any).graphqlRequest(query, variables)
          .then(res => res.createUser);
    }));

    // get all data from source
    const findAllQuery = await (this as any).dataSources.users.find();
    const usersFromDB = findAllQuery.data;

    // find 5th user
    const expectCertainUser = usersFromDB[4];
    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "${expectCertainUser.id}"}) {${fields}}
      }
    `);
    expect(certainUser).to.deep.equal(expectCertainUser);

    // find users with status NOT_OK
    const expectedNotOkUsers = usersFromDB.filter(user => user.status === 'NOT_OK');
    const {users: notOkUsers} = await (this as any).graphqlRequest(`
      query {
        users(where: {status: NOT_OK}) {${fields}}
      }
    `);
    expect(notOkUsers).to.have.deep.members(expectedNotOkUsers);

    // paginate users without where
    const first = 5;
    const after = usersFromDB[0].id;

    // we already created one user in previous test
    const expectedPageUsers = usersFromDB.slice(1, first + 1);
    const {users: pageUsers} = await (this as any).graphqlRequest(`
      query {
        users(first: ${first}, after: "${after}") {${fields}}
      }
    `);
    expect(pageUsers).to.have.deep.members(expectedPageUsers);
    expect(pageUsers.length).to.be.equal(expectedPageUsers.length);

    // paginate users with where
    const last = 3;
    const before = notOkUsers[5].id;
    const expectedPageUsersWithWhere = notOkUsers
      .slice(2, notOkUsers.findIndex(user => user.id === before));
    const {users: pageUsersWithWhere} = await (this as any).graphqlRequest(`
      query {
        users(last: ${last}, before: "${before}", where: {status: NOT_OK}) {${fields}}
      }
    `);
    expect(pageUsersWithWhere).to.have.deep.members(expectedPageUsersWithWhere);
    expect(pageUsersWithWhere.length).to.be.equal(expectedPageUsersWithWhere.length);
  });

  it('should create many records to test relay style api', async () => {
    // create 20 users, make 10 of them having status NOT_OK
    await Promise.all(
      times(20, index => {
        const data = index < 10 ? fakeUserData({status: 'NOT_OK'}) : fakeUserData();
        return data;
      })
      .map(userData => {
        const variables = {
          data: wrapSetToArrayField(userData),
        };

        const query = `
          mutation ($data: UserCreateInput!) {
            createUser (data: $data) {${fields}}
          }
        `;
        return (this as any).graphqlRequest(query, variables)
          .then(res => res.createUser);
    }));

    // get all data from source
    const findAllQuery = await (this as any).dataSources.users.find();
    const usersFromDB = findAllQuery.data;

    // find users with status NOT_OK
    const expectedNotOkUsers = usersFromDB.filter(user => user.status === 'NOT_OK');
    const {usersConnection: notOkUserResponse} = await (this as any).graphqlRequest(`
      query {
        usersConnection(where: {status: NOT_OK}) {${relayFields}}
      }
    `);
    expect(notOkUserResponse.pageInfo).to.be.eql({
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: _first<any>(expectedNotOkUsers).id,
      endCursor: _last<any>(expectedNotOkUsers).id,
    });
    expect(notOkUserResponse.edges).to.have.deep
      .members(expectedNotOkUsers.map(user => {
        return {
          cursor: user.id,
          node: user,
        };
      }));

    // pagination query
    // skip first one
    const first = 5;
    const after = usersFromDB[0].id;
    const expectedPageUsers = usersFromDB.slice(1, first + 1);
    const {usersConnection: pageUserResponse} = await (this as any).graphqlRequest(`
      query {
        usersConnection(first: ${first}, after: "${after}") {${relayFields}}
      }
    `);
    expect(pageUserResponse.pageInfo).to.be.eql({
      hasNextPage: true,
      hasPreviousPage: true,
      startCursor: _first<any>(expectedPageUsers).id,
      endCursor: _last<any>(expectedPageUsers).id,
    });
    expect(pageUserResponse.edges).to.have.deep
      .members(expectedPageUsers.map(user => {
        return {
          cursor: user.id,
          node: user,
        };
      }));
    expect(pageUserResponse.edges.length).to.be.equal(expectedPageUsers.length);

    // paginate users with where
    const last = 3;
    const before = expectedNotOkUsers[5].id;
    const expectedPageUsersWithWhere = expectedNotOkUsers
      .slice(2, expectedNotOkUsers.findIndex(user => user.id === before));
    const {usersConnection: pageUsersWithWhereResponse} = await (this as any).graphqlRequest(`
      query {
        usersConnection(last: ${last}, before: "${before}", where: {status: NOT_OK}) {${relayFields}}
      }
    `);
    expect(pageUsersWithWhereResponse.pageInfo).to.be.eql({
      hasNextPage: true,
      hasPreviousPage: true,
      startCursor: _first<any>(expectedPageUsersWithWhere).id,
      endCursor: _last<any>(expectedPageUsersWithWhere).id,
    });
    expect(pageUsersWithWhereResponse.edges).to.have.deep
      .members(expectedPageUsersWithWhere.map(user => {
        return {
          cursor: user.id,
          node: user,
        };
      }));
    expect(pageUsersWithWhereResponse.edges.length).to.be.equal(expectedPageUsersWithWhere.length);
  });

  it('should update', async () => {
    const createUserVariables = {
      data: wrapSetToArrayField(fakeUserData()),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        username: faker.internet.userName(),
        note: {
          set: [{title: faker.lorem.slug(10), text: faker.lorem.sentence(100)}],
        },
      },
    };
    const updateUserQuery = `
      mutation ($data: UserUpdateInput!) {
        updateUser (where: {id: "${createUser.id}"}, data: $data) { id }
      }
    `;
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.equal(createUser.id);

    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "${createUser.id}"}) {${fields}}
      }
    `);
    expect(certainUser.username).to.deep.equal(updateUserVariables.data.username);
    expect(certainUser.note).to.eql(updateUserVariables.data.note.set);
  });

  it('should update with args', async () => {
    const createUserVariables = {
      data: wrapSetToArrayField(fakeUserData()),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    const newUsername = faker.internet.userName();
    const updateUserQuery = `
      mutation {
        updateUser (where: {id: "${createUser.id}"}, data: {username: "${newUsername}"}) { id }
      }
    `;
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery);
    expect(updateUser.id).to.be.equal(createUser.id);

    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "${createUser.id}"}) {${fields}}
      }
    `);
    expect(certainUser.username).to.deep.equal(newUsername);
  });

  it('should delete', async () => {
    const createUserVariables = {
      data: wrapSetToArrayField(fakeUserData()),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${fields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    const query = `
      mutation {
        deleteUser (where: {id: "${createUser.id}"}) { id }
      }
    `;
    const {deleteUser} = await (this as any).graphqlRequest(query);
    expect(deleteUser.id).to.be.equal(createUser.id);

    const {user: certainUser} = await (this as any).graphqlRequest(`
      query {
        user(where: {id: "${createUser.id}"}) {${fields}}
      }
    `);
    // tslint:disable-next-line:no-unused-expression
    expect(certainUser).to.be.null;
  });
}
