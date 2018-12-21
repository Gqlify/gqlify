import chai from 'chai';
import faker from 'faker';
import { readFileSync } from 'fs';
import path from 'path';
const expect = chai.expect;

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

const groupFields = `
  id
  name
`;

const userWithGroupFields = `
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
  groups {
    ${groupFields}
  }
`;

const groupWithUserFields = `
  id
  name
  members {
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

export const sdl = readFileSync(path.resolve(__dirname, '../fixtures/manyToMany.graphql'), {encoding: 'utf8'});

export function testSuits() {
  it('should create unconnected item with bi-*-to-* from one side', async () => {
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    expect(createGroup).to.have.property('id');
    expect(createGroup.name).to.be.eql(createGroupVariables.data.name);
    // tslint:disable-next-line:no-unused-expression
    expect(createGroup.members).to.be.an('array').that.is.empty;
  });

  it('should create with create item with bi-*-to-* from one side', async () => {
    // create user
    const user = fakeUserData();

    // create with to-one relation
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
        members: {
          create: [user],
        },
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);
    expect(createGroup).to.have.property('id');
    expect(createGroup).to.deep.include({
      name: createGroupVariables.data.name,
    });
    expect(createGroup.members[0]).to.deep.include(user);
  });

  it('should create connected item with bi-*-to-* from one side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // create with to-one relation
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
        members: {
          connect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    expect(createGroup).to.have.property('id');
    expect(createGroup).to.deep.include({
      name: createGroupVariables.data.name,
      members: [createUser],
    });
  });

  it('should connect unconnected with bi-*-to-* from one side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // create new user
    const createNewUserVariables = {
      data: fakeUserData(),
    };
    const {createUser: newUser} = await (this as any).graphqlRequest(createUserQuery, createNewUserVariables);

    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createGroup.members).to.be.an('array').that.is.empty;

    // update to-one relation
    const updateGroupQuery = `
      mutation($where: GroupWhereUniqueInput!, $data: GroupUpdateInput!) {
        updateGroup (where: $where, data: $data) { id }
      }
    `;
    const updateGroupVariables = {
      where: { id: createGroup.id },
      data: {
        members: {
          connect: [
            { id: createUser.id },
            { id: newUser.id },
          ],
        },
      },
    };
    const {updateGroup} = await (this as any).graphqlRequest(updateGroupQuery, updateGroupVariables);
    expect(updateGroup.id).to.be.eql(createGroup.id);

    // query
    const getGroupQuery = `
      query ($where: GroupWhereUniqueInput!) {
        group (where: $where) { ${groupWithUserFields} }
      }
    `;
    const getGroupVariables = {
      where: { id: createGroup.id },
    };
    const {group} = await (this as any).graphqlRequest(getGroupQuery, getGroupVariables);
    expect(group).to.deep.include({
      name: createGroupVariables.data.name,
      members: [createUser, newUser],
    });
  });

  it('should update with create with bi-*-to-* from one side', async () => {
    const user = fakeUserData();
    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createGroup.members).to.be.an('array').that.is.empty;

    // update relation
    const updateGroupQuery = `
      mutation($where: GroupWhereUniqueInput!, $data: GroupUpdateInput!) {
        updateGroup (where: $where, data: $data) { id }
      }
    `;
    const updateGroupVariables = {
      where: { id: createGroup.id },
      data: {
        members: {
          create: [user],
        },
      },
    };
    const {updateGroup} = await (this as any).graphqlRequest(updateGroupQuery, updateGroupVariables);
    expect(updateGroup.id).to.be.eql(createGroup.id);

    // query
    const getGroupQuery = `
      query ($where: GroupWhereUniqueInput!) {
        group (where: $where) { ${groupWithUserFields} }
      }
    `;
    const getGroupVariables = {
      where: { id: createGroup.id },
    };
    const {group} = await (this as any).graphqlRequest(getGroupQuery, getGroupVariables);
    expect(group).to.deep.include({
      name: createGroupVariables.data.name,
    });
    expect(group.members[0]).be.deep.include(user);
  });

  it('should connect unconnected and disconnect connected with bi-*-to-* from one side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
        members: {
          connect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);
    expect(createGroup.members).to.have.deep.members([createUser]);

    // create new user
    const createNewUserVariables = {
      data: fakeUserData(),
    };
    const {createUser: newUser} = await (this as any).graphqlRequest(createUserQuery, createNewUserVariables);

    // update to-one relation
    const updateGroupQuery = `
      mutation($where: GroupWhereUniqueInput!, $data: GroupUpdateInput!) {
        updateGroup (where: $where, data: $data) { id }
      }
    `;
    const updateGroupVariables = {
      where: { id: createGroup.id },
      data: {
        members: {
          connect: [
            { id: newUser.id },
          ],
          disconnect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {updateGroup} = await (this as any).graphqlRequest(updateGroupQuery, updateGroupVariables);
    expect(updateGroup.id).to.be.eql(createGroup.id);

    // query
    const getGroupQuery = `
      query ($where: GroupWhereUniqueInput!) {
        group (where: $where) { ${groupWithUserFields} }
      }
    `;
    const getGroupVariables = {
      where: { id: createGroup.id },
    };
    const {group} = await (this as any).graphqlRequest(getGroupQuery, getGroupVariables);
    expect(group).to.deep.include({
      name: createGroupVariables.data.name,
      members: [newUser],
    });
  });

  it('should disconnect connected item with bi-*-to-* from one side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupWithUserFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
        members: {
          connect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);
    expect(createGroup.members).to.have.deep.members([createUser]);

    // update to-one relation
    const updateGroupQuery = `
      mutation($where: GroupWhereUniqueInput!, $data: GroupUpdateInput!) {
        updateGroup (where: $where, data: $data) { id }
      }
    `;
    const updateGroupVariables = {
      where: { id: createGroup.id },
      data: {
        members: {
          disconnect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {updateGroup} = await (this as any).graphqlRequest(updateGroupQuery, updateGroupVariables);
    expect(updateGroup.id).to.be.eql(createGroup.id);

    // query
    const getGroupQuery = `
      query ($where: GroupWhereUniqueInput!) {
        group (where: $where) { ${groupWithUserFields} }
      }
    `;
    const getGroupVariables = {
      where: { id: createGroup.id },
    };
    const {group} = await (this as any).graphqlRequest(getGroupQuery, getGroupVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(group.members).to.be.an('array').that.is.empty;
  });

  it('should disconnect unconnected item with bi-*-to-* from one side');

  it('should create unconnected item with bi-*-to-* from the other side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithGroupFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    expect(createUser).to.have.property('id');
    // tslint:disable-next-line:no-unused-expression
    expect(createUser.groups).to.be.an('array').that.is.empty;
  });

  it('should create connected item with bi-*-to-* from the other side', async () => {
    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        groups: {
          connect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithGroupFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    expect(createUser).to.have.property('id');
    expect(createUser).to.deep.include({
      ...createUserVariables.data,
      groups: [createGroup],
    });
  });

  it('should connect unconnected item with bi-*-to-* from one side', async () => {
    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // update user
    const updateUserQuery = `
      mutation ($where: UserWhereUniqueInput!, $data: UserUpdateInput!) {
        updateUser (where: $where, data: $data) { id }
      }
    `;
    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        groups: {
          connect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithGroupFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    expect(user.groups).to.have.deep.members([createGroup]);
  });

  it('should update connect on connected item with bi-*-to-* from one side', async () => {
    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        groups: {
          connect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithGroupFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // new Book
    const createNewBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup: newGroup} = await (this as any).graphqlRequest(createGroupQuery, createNewBookVariables);

    // update user
    const updateUserQuery = `
      mutation ($where: UserWhereUniqueInput!, $data: UserUpdateInput!) {
        updateUser (where: $where, data: $data) { id }
      }
    `;
    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        groups: {
          connect: [
            { id: newGroup.id },
          ],
          disconnect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithGroupFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    expect(user.groups).to.have.deep.members([newGroup]);
  });

  it('should disconnect connected item with bi-*-to-* from one side', async () => {
    // create group
    const createGroupQuery = `
      mutation ($data: GroupCreateInput!) {
        createGroup (data: $data) {${groupFields}}
      }
    `;
    const createGroupVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createGroup} = await (this as any).graphqlRequest(createGroupQuery, createGroupVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        groups: {
          connect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithGroupFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createUser.groups).to.not.be.empty;

    // update user
    const updateUserQuery = `
      mutation ($where: UserWhereUniqueInput!, $data: UserUpdateInput!) {
        updateUser (where: $where, data: $data) { id }
      }
    `;
    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        groups: {
          disconnect: [
            { id: createGroup.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithGroupFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    // tslint:disable-next-line:no-unused-expression
    expect(user.groups).to.be.an('array').that.is.empty;
  });

  it('should disconnect unconnected item with bi-*-to-* from one side');
}
