// import { initializeApp, credential } from 'firebase-admin';
import * as admin from 'firebase-admin';
import { first, isUndefined, get, pull } from 'lodash';

import {
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
  filter,
  paginate,
  sort
} from '@gqlify/server';

export default class FirebaseDataSource implements DataSource {
  private db: admin.database.Database;
  private path: string;
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor({ cert, path }: { cert: admin.ServiceAccount, path: string }) {
    this.db = admin.initializeApp({
      credential: admin.credential.cert(cert),
    }).database();
    this.path = path;
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    const filteredData = sort(filter(snapshot.val(), where), orderBy);
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    return first(filter(snapshot.val(), where));
  }

  public async findOneById(id: string): Promise<any> {
    const ref = this.db.ref(`/${this.path}/${id}`);
    const snapshot = await ref.once('value');
    return first(snapshot.val());
  }

  public async create(payload: any): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    ref.push(payload);
  }

  public async update(where: Where, payload: any): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.ref(`/${this.path}`).child(where.id.eq);
    ref.update(payload);
  }

  public async delete(where: Where): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.ref(`/${this.path}/${where.id.eq}`);
    ref.remove();
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    return first(filter(snapshot.val(), {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<any> {
    throw Error('Not Implement');
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    return filter(snapshot.val(), {[foreignKey]: {[Operator.eq]: foreignId}});
  }

  // ManyToManyRelation
  public async findManyFromManyRelation(sourceSideName: string, targetSideName: string, sourceSideId: string) {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    return get(this.relationTable, [relationTableName, sourceSideId]) || [];
  }

  public async addIdToManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    if (!this.relationTable[relationTableName]) {
      this.relationTable[relationTableName] = {[sourceSideId]: []};
    }

    if (isUndefined(this.relationTable[relationTableName][sourceSideId])) {
      this.relationTable[relationTableName][sourceSideId] = [];
    }

    this.relationTable[relationTableName][sourceSideId].push(targetSideId);
  }

  public async removeIdFromManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    if (!this.relationTable[relationTableName] ||
      isUndefined(this.relationTable[relationTableName][sourceSideId])) {
      return;
    }

    pull(this.relationTable[relationTableName][sourceSideId], targetSideId);
  }
}
