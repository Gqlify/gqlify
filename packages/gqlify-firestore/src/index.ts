import * as admin from 'firebase-admin';
import { first, isEmpty, isUndefined, get, pull } from 'lodash';

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

export class FirestoreDataSource implements DataSource {
  private db: admin.firestore.Firestore;
  private path: string;
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor(cert: admin.ServiceAccount, dbUrl: string, path: string) {
    this.db = isEmpty(admin.apps)
      ? admin.initializeApp({
        credential: admin.credential.cert(cert),
        databaseURL: dbUrl,
      }).firestore()
      : admin.app().firestore();
    this.path = path;
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const ref = this.db.collection(this.path);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    const filteredData = sort(filter(data, where), orderBy);
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    const ref = this.db.collection(this.path);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    return first(filter(data, where));
  }

  public async findOneById(id: string): Promise<any> {
    const ref = this.db.collection(this.path).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return;
    }
    return doc.data();
  }

  public async create(payload: any): Promise<any> {
    const ref = await this.db.collection(this.path).add(payload);
    await ref.update({ id: ref.id });
    const doc = await ref.get();
    return doc.data();
  }

  public async update(where: Where, payload: any): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.collection(this.path).doc(where.id.eq);
    await ref.update(payload);
  }

  public async delete(where: Where): Promise<any> {
    // WARNING: where may not contain id
    await this.db.collection(this.path).doc(where.id.eq).delete();
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    const ref = this.db.collection(this.path);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    return first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<any> {
    throw Error('Not Implement');
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    const ref = this.db.collection(this.path);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    return filter(data, {[foreignKey]: {[Operator.eq]: foreignId}});
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
