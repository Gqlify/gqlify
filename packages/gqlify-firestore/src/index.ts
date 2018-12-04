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

export default class FirestoreDataSource implements DataSource {
  private db: admin.firestore.Firestore;
  private path: string;
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor({ cert, path }: { cert: admin.ServiceAccount, path: string }) {
    this.db = admin.initializeApp({
      credential: admin.credential.cert(cert),
    }).firestore();
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
    const ref = this.db.collection(this.path).doc();
    ref.set(payload);
  }

  public async update(where: Where, payload: any): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.collection(this.path).doc(where.id.eq);
    ref.update(payload);
  }

  public async delete(where: Where): Promise<any> {
    // WARNING: where may not contain id
    this.db.collection(this.path).doc(where.id.eq).delete();
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
