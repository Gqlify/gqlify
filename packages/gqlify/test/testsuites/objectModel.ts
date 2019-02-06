import chai from 'chai';
import faker from 'faker';
import { readFileSync } from 'fs';
import path from 'path';
import { times, first as _first, last as _last } from 'lodash';
import { wrapSetToArrayField } from './utils';

const expect = chai.expect;

const fields = `
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

export const sdl = readFileSync(path.resolve(__dirname, '../fixtures/object.graphql'), {encoding: 'utf8'});

export function testSuits() {
  it('should respond empty object', async () => {
    const profileQuery = `
      query {
        profile {${fields}}
      }
    `;
    const {profile} = await (this as any).graphqlRequest(profileQuery);
    expect(profile).to.be.eql({
      username: null,
      email: null,
      status: null,
      attributes: null,
      location: null,
      note: null,
    });
  });

  it('should update object', async () => {
    const data = fakeUserData();
    const variables = {
      data: wrapSetToArrayField(data),
    };

    const query = `
      mutation ($data: ProfileUpdateInput!) {
        updateProfile (data: $data) {success}
      }
    `;
    await (this as any).graphqlRequest(query, variables);

    // query
    const {profile} = await (this as any).graphqlRequest(`
      query {
        profile {${fields}}
      }
    `);
    expect(profile).to.deep.equal(data);

    // partial update
    const delta = {
      username: faker.internet.userName(),
    };
    await (this as any).graphqlRequest(query, {
      data: delta,
    });

    // query again
    const {profile: updatedProfile} = await (this as any).graphqlRequest(`
      query {
        profile {${fields}}
      }
    `);
    expect(updatedProfile).to.deep.equal({
      ...data,
      ...delta,
    });
  });
}
