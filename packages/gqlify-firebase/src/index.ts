// import { initializeApp, credential } from 'firebase-admin';
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

export class FirebaseDataSource implements DataSource {
  private db: admin.database.Database;
  private path: string;
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor(cert: admin.ServiceAccount, dbUrl: string, path: string) {
    this.db = isEmpty(admin.apps)
      ? admin.initializeApp({
        credential: admin.credential.cert(cert),
        databaseURL: dbUrl,
      }).database()
      : admin.app().database();
    this.path = path;
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    const data = snapshot.val();
    const filteredData = data
      ? sort(filter(data, where), orderBy)
      : [];
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
    return snapshot.val();
  }

  public async create(payload: any): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    const newItem = await ref.push(payload);
    await newItem.update({ id: newItem.key });
    const snapshot = await this.db.ref(`/${this.path}/${newItem.key}`).once('value');
    return snapshot.val();
  }

  public async update(where: Where, payload: any): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.ref(`/${this.path}`).child(where.id.eq);
    await ref.update(payload);
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
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.once('value');
    const oldOwner = first(filter(snapshot.val(), {[foreignKey]: {[Operator.eq]: foreignId}}));
    if (oldOwner) {
      const oldRef = this.db.ref(`/${this.path}/${(oldOwner as any).id}`);
      await oldRef.update({[foreignKey]: null});
    }

    const newRef = this.db.ref(`/${this.path}/${id}`);
    await newRef.update({[foreignKey]: foreignId});
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
