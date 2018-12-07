/**
 * OneModel is for simple CRUD test
 */
import chai from 'chai';
import chaiHttp = require('chai-http');
chai.use(chaiHttp);
import { readFileSync } from 'fs';
import GraphQLJSON from 'graphql-type-json';
import * as admin from 'firebase-admin';

import { FirebaseDataSource } from '@gqlify/firebase';
import { FirestoreDataSource } from '@gqlify/firestore';
import { MongodbDataSourceGroup } from '@gqlify/mongodb';
import MemoryDataSource from '../src/dataSource/memoryDataSource';

import faker from 'faker';
import { createApp } from './createApp';

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI;

const expect = chai.expect;
const sdl = readFileSync(__dirname + '/fixtures/oneToMany.graphql', {encoding: 'utf8'});
const serviceAccount = readFileSync(process.env.TEST_FIREBASE_CERT, {encoding: 'utf8'});

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
`;

const userWithBookFields = `
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
  books {
    ${bookFields}
  }
`;

const bookWithUserFields = `
  ${bookFields}
  author {
    ${userFields}
  }
`;

const teamFields = `
  id
  name
  players {
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

describe('Relation tests on fixtures/oneToMany.graphql on Memory Data Source', function() {
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

describe('Relation tests on fixtures/oneToMany.graphql with Firebase Data Source', function() {
  this.timeout(25000);

  before(async () => {
    const serviceAccountJson = JSON.parse(serviceAccount);
    const dbUrl = `https://${serviceAccountJson.project_id}.firebaseio.com`;
    const {graphqlRequest, close} = createApp({
      sdl,
      dataSources: {
        memory: args => new FirebaseDataSource(serviceAccountJson, dbUrl, args.key),
      },
      scalars: {
        JSON: GraphQLJSON,
      },
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).firebase = admin.app().database();
  });

  afterEach(async () => {
    await (this as any).firebase.ref('/').remove();
  });

  after(async () => {
    await (this as any).close();
    await admin.app().delete();
  });

  testSuits.call(this);
});

describe('Relation tests on fixtures/oneToMany.graphql with Firestore Data Source', function() {
  this.timeout(25000);

  before(async () => {
    const serviceAccountJson = JSON.parse(serviceAccount);
    const dbUrl = `https://${serviceAccountJson.project_id}.firebaseio.com`;
    const {graphqlRequest, close} = createApp({
      sdl,
      dataSources: {
        memory: args => new FirestoreDataSource(serviceAccountJson, dbUrl, args.key),
      },
      scalars: {
        JSON: GraphQLJSON,
      },
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).firestore = admin.app().firestore();
  });

  afterEach(async () => {
    const collections = await (this as any).firestore.getCollections();
    await Promise.all(collections.map(async collection => {
      const collectionRef = (this as any).firestore.collection('users');
      const querySnapshot = await collectionRef.get();
      const docPaths = [];
      querySnapshot.forEach(documentSnapshot => {
        docPaths.push(documentSnapshot.ref.path);
      });

      await Promise.all(docPaths.map(async docPath => {
        const docRef = (this as any).firestore.doc(docPath);
        await docRef.delete();
      }));
    }));
  });

  after(async () => {
    await (this as any).close();
    await admin.app().delete();
  });

  testSuits.call(this);
});

describe('Tests on fixtures/oneToMany.graphql with MongoDB Data Source', function() {
  this.timeout(20000);

  before(async () => {
    let db;
    const mongodbDataSourceGroup = new MongodbDataSourceGroup(TEST_MONGODB_URI, 'gqlify');
    await mongodbDataSourceGroup.initialize();

    const {graphqlRequest, close} = createApp({
      sdl,
      dataSources: {
        memory: args => {
          db = mongodbDataSourceGroup.getDataSource(args.key);
          return db;
        },
      },
      scalars: {
        JSON: GraphQLJSON,
      },
    });
    (this as any).graphqlRequest = graphqlRequest;
    (this as any).close = close;
    (this as any).db = db;
    (this as any).mongodb = (mongodbDataSourceGroup as any).db;
  });

  afterEach(async () => {
    const listCollectionsQuery = await (this as any).mongodb.listCollections();
    const collections = await listCollectionsQuery.toArray();
    await Promise.all(collections.map(async collection => {
      await (this as any).mongodb.collection(collection.name).deleteMany({});
    }));
  });

  after(async () => {
    await (this as any).close();
  });

  testSuits.call(this);
});

export function testSuits() {
  it('should create unconnected item with uni-1-to-*', async () => {
    const createTeamQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const createTeamVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createTeam} = await (this as any).graphqlRequest(createTeamQuery, createTeamVariables);

    expect(createTeam).to.have.property('id');
    // tslint:disable-next-line:no-unused-expression
    expect(createTeam.players).to.be.an('array').that.is.empty;
    expect(createTeam).to.deep.include({
      name: createTeamVariables.data.name,
    });
  });

  it('should create connected item with uni-1-to-*', async () => {
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
    const createTeamQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const createTeamVariables = {
      data: {
        name: faker.internet.userName(),
        players: {
          connect: [
            {id: createUser.id},
          ],
        },
      },
    };
    const {createTeam} = await (this as any).graphqlRequest(createTeamQuery, createTeamVariables);

    expect(createTeam).to.have.property('id');
    expect(createTeam).to.deep.include({
      name: createTeamVariables.data.name,
      players: [createUser],
    });
  });

  it('should update connect on multi unconnected item with uni-1-to-*', async () => {
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
    const {createUser: anotherUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    const createTeamQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const createTeamVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createTeam} = await (this as any).graphqlRequest(createTeamQuery, createTeamVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createTeam.players).to.be.an('array').that.is.empty;

    // update to-one relation
    const updateTeamQuery = `
      mutation ($where: TeamWhereUniqueInput! $data: TeamUpdateInput!) {
        updateTeam (where: $where, data: $data) { id }
      }
    `;
    const updateTeamVariables = {
      where: { id: createTeam.id },
      data: {
        players: {
          connect: [
            { id: createUser.id },
            { id: anotherUser.id },
          ],
        },
      },
    };
    const {updateTeam} = await (this as any).graphqlRequest(updateTeamQuery, updateTeamVariables);
    expect(updateTeam.id).to.be.eql(createTeam.id);

    // createUserQuery
    const getTeamQuery = `
      query ($where: TeamWhereUniqueInput!) {
        team (where: $where) { ${teamFields} }
      }
    `;
    const getTeamVariables = {
      where: { id: updateTeam.id },
    };
    const {team} = await (this as any).graphqlRequest(getTeamQuery, getTeamVariables);
    expect(team.players).to.have.deep.members([createUser, anotherUser]);
  });

  it('should update unconnected and disconnect connected item in one query with uni-1-to-*', async () => {
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
    const createTeamQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const createTeamVariables = {
      data: {
        name: faker.internet.userName(),
        players: {
          connect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {createTeam} = await (this as any).graphqlRequest(createTeamQuery, createTeamVariables);

    // new user
    const createNewUserVariables = {
      data: fakeUserData(),
    };
    const {createUser: newUser} = await (this as any).graphqlRequest(createUserQuery, createNewUserVariables);

    // update to-one relation
    const updateTeamQuery = `
      mutation ($where: TeamWhereUniqueInput! $data: TeamUpdateInput!) {
        updateTeam (where: $where, data: $data) { id }
      }
    `;
    const updateTeamVariables = {
      where: { id: createTeam.id },
      data: {
        players: {
          connect: [
            { id: newUser.id },
          ],
          disconnect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {updateTeam} = await (this as any).graphqlRequest(updateTeamQuery, updateTeamVariables);
    expect(updateTeam.id).to.be.eql(createTeam.id);

    // createUserQuery
    const getTeamQuery = `
      query ($where: TeamWhereUniqueInput!) {
        team (where: $where) { ${teamFields} }
      }
    `;
    const getTeamVariables = {
      where: { id: updateTeam.id },
    };
    const {team} = await (this as any).graphqlRequest(getTeamQuery, getTeamVariables);
    expect(team.players).to.have.deep.members([newUser]);
  });

  it('should disconnect connected item with uni-1-to-*', async () => {
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
    const createTeamQuery = `
      mutation ($data: TeamCreateInput!) {
        createTeam (data: $data) {${teamFields}}
      }
    `;
    const createTeamVariables = {
      data: {
        name: faker.internet.userName(),
        players: {
          connect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {createTeam} = await (this as any).graphqlRequest(createTeamQuery, createTeamVariables);

    // update to-one relation
    const updateTeamQuery = `
      mutation ($where: TeamWhereUniqueInput! $data: TeamUpdateInput!) {
        updateTeam (where: $where, data: $data) { id }
      }
    `;
    const updateTeamVariables = {
      where: { id: createTeam.id },
      data: {
        players: {
          disconnect: [
            { id: createUser.id },
          ],
        },
      },
    };
    const {updateTeam} = await (this as any).graphqlRequest(updateTeamQuery, updateTeamVariables);
    expect(updateTeam.id).to.be.eql(createTeam.id);

    // createUserQuery
    const getTeamQuery = `
      query ($where: TeamWhereUniqueInput!) {
        team (where: $where) { ${teamFields} }
      }
    `;
    const getTeamVariables = {
      where: { id: updateTeam.id },
    };
    const {team} = await (this as any).graphqlRequest(getTeamQuery, getTeamVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(team.players).to.be.an('array').that.is.empty;
  });

  it('should disconnect unconnected item with uni-1-to-1');

  it('should create unconnected item with bi-1-to-* from one side', async () => {
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookWithUserFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

    expect(createBook).to.have.property('id');
    // tslint:disable-next-line:no-unused-expression
    expect(createBook.author).to.be.null;
    expect(createBook.name).to.be.eql(createBookVariables.data.name);
  });

  it('should create connected item with bi-1-to-* from one side', async () => {
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
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookWithUserFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
        author: {
          connect: { id: createUser.id },
        },
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

    expect(createBook).to.have.property('id');
    expect(createBook).to.deep.include({
      name: createBookVariables.data.name,
      author: createUser,
    });
  });

  it('should update connect on unconnected item with bi-1-to-* from one side', async () => {
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

    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookWithUserFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createBook.author).to.be.null;

    // update to-one relation
    const updateBookQuery = `
      mutation($where: BookWhereUniqueInput!, $data: BookUpdateInput!) {
        updateBook (where: $where, data: $data) { id }
      }
    `;
    const updateBookVariables = {
      where: { id: createBook.id },
      data: {
        author: {
          connect: { id: createUser.id },
        },
      },
    };
    const {updateBook} = await (this as any).graphqlRequest(updateBookQuery, updateBookVariables);
    expect(updateBook.id).to.be.eql(createBook.id);

    // query
    const getBookQuery = `
      query ($where: BookWhereUniqueInput!) {
        book (where: $where) { ${bookWithUserFields} }
      }
    `;
    const getBookVariables = {
      where: { id: createBook.id },
    };
    const {book} = await (this as any).graphqlRequest(getBookQuery, getBookVariables);
    expect(book).to.deep.include({
      name: createBookVariables.data.name,
      author: createUser,
    });
  });

  it('should update connect on connected item with bi-1-to-* from one side', async () => {
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

    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookWithUserFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
        author: {
          connect: { id: createUser.id },
        },
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);
    expect(createBook.author).to.be.eql(createUser);

    // create new user
    const createNewUserVariables = {
      data: fakeUserData(),
    };
    const {createUser: newUser} = await (this as any).graphqlRequest(createUserQuery, createNewUserVariables);

    // update to-one relation
    const updateBookQuery = `
      mutation($where: BookWhereUniqueInput!, $data: BookUpdateInput!) {
        updateBook (where: $where, data: $data) { id }
      }
    `;
    const updateBookVariables = {
      where: { id: createBook.id },
      data: {
        author: {
          connect: { id: newUser.id },
        },
      },
    };
    const {updateBook} = await (this as any).graphqlRequest(updateBookQuery, updateBookVariables);
    expect(updateBook.id).to.be.eql(createBook.id);

    // query
    const getBookQuery = `
      query ($where: BookWhereUniqueInput!) {
        book (where: $where) { ${bookWithUserFields} }
      }
    `;
    const getBookVariables = {
      where: { id: createBook.id },
    };
    const {book} = await (this as any).graphqlRequest(getBookQuery, getBookVariables);
    expect(book).to.deep.include({
      name: createBookVariables.data.name,
      author: newUser,
    });
  });

  it('should disconnect connected item with bi-1-to-1 from one side', async () => {
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

    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookWithUserFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
        author: {
          connect: { id: createUser.id },
        },
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);
    expect(createBook.author).to.be.eql(createUser);

    // update to-one relation
    const updateBookQuery = `
      mutation($where: BookWhereUniqueInput!, $data: BookUpdateInput!) {
        updateBook (where: $where, data: $data) { id }
      }
    `;
    const updateBookVariables = {
      where: { id: createBook.id },
      data: {
        author: {
          disconnect: true,
        },
      },
    };
    const {updateBook} = await (this as any).graphqlRequest(updateBookQuery, updateBookVariables);
    expect(updateBook.id).to.be.eql(createBook.id);

    // query
    const getBookQuery = `
      query ($where: BookWhereUniqueInput!) {
        book (where: $where) { ${bookWithUserFields} }
      }
    `;
    const getBookVariables = {
      where: { id: createBook.id },
    };
    const {book} = await (this as any).graphqlRequest(getBookQuery, getBookVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(book.author).to.be.null;
  });

  it('should disconnect unconnected item with bi-1-to-1 from one side');

  it('should create unconnected item with bi-1-to-1 from the other side', async () => {
    // create user
    const createUserVariables = {
      data: fakeUserData(),
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithBookFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    expect(createUser).to.have.property('id');
    // tslint:disable-next-line:no-unused-expression
    expect(createUser.books).to.be.an('array').that.is.empty;
  });

  it('should create connected item with bi-1-to-* from the other side', async () => {
    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        books: {
          connect: [
            { id: createBook.id },
          ],
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithBookFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    expect(createUser).to.have.property('id');
    expect(createUser).to.deep.include({
      ...createUserVariables.data,
      books: [createBook],
    });
  });

  it('should update connect on unconnected item with bi-1-to-1 from one side', async () => {
    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

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
        books: {
          connect: [
            { id: createBook.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithBookFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    expect(user.books).to.have.deep.members([createBook]);
  });

  it('should update connect on connected item with bi-1-to-1 from one side', async () => {
    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        books: {
          connect: { id: createBook.id },
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithBookFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);

    // new Book
    const createNewBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook: newBook} = await (this as any).graphqlRequest(createBookQuery, createNewBookVariables);

    // update user
    const updateUserQuery = `
      mutation ($where: UserWhereUniqueInput!, $data: UserUpdateInput!) {
        updateUser (where: $where, data: $data) { id }
      }
    `;
    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        books: {
          connect: [
            { id: newBook.id },
          ],
          disconnect: [
            { id: createBook.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithBookFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    expect(user.books).to.have.deep.members([newBook]);
  });

  it('should disconnect connected item with bi-1-to-1 from one side', async () => {
    // create book
    const createBookQuery = `
      mutation ($data: BookCreateInput!) {
        createBook (data: $data) {${bookFields}}
      }
    `;
    const createBookVariables = {
      data: {
        name: faker.internet.userName(),
      },
    };
    const {createBook} = await (this as any).graphqlRequest(createBookQuery, createBookVariables);

    // create user
    const createUserVariables = {
      data: {
        ...fakeUserData(),
        books: {
          connect: { id: createBook.id },
        },
      },
    };
    const createUserQuery = `
      mutation ($data: UserCreateInput!) {
        createUser (data: $data) {${userWithBookFields}}
      }
    `;
    const {createUser} = await (this as any).graphqlRequest(createUserQuery, createUserVariables);
    // tslint:disable-next-line:no-unused-expression
    expect(createUser.books).to.not.be.null;

    // update user
    const updateUserQuery = `
      mutation ($where: UserWhereUniqueInput!, $data: UserUpdateInput!) {
        updateUser (where: $where, data: $data) { id }
      }
    `;
    const updateUserVariables = {
      where: { id: createUser.id },
      data: {
        books: {
          disconnect: [
            { id: createBook.id },
          ],
        },
      },
    };
    const {updateUser} = await (this as any).graphqlRequest(updateUserQuery, updateUserVariables);
    expect(updateUser.id).to.be.eql(createUser.id);

    // get user
    const getUserQuery = `
      query ($where: UserWhereUniqueInput!) {
        user (where: $where) { ${userWithBookFields} }
      }
    `;
    const getUserVariable = {
      where: { id: createUser.id },
    };
    const {user} = await (this as any).graphqlRequest(getUserQuery, getUserVariable);
    // tslint:disable-next-line:no-unused-expression
    expect(user.books).to.be.an('array').that.is.empty;
  });

  it('should disconnect unconnected item with bi-1-to-1 from one side');
}
