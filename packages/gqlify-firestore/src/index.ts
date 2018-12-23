import * as admin from 'firebase-admin';
import { first, isEmpty, isNil, isUndefined, get, pull, reduce } from 'lodash';

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

const snapToArray = (snapshot: admin.firestore.QuerySnapshot) => {
  const data = [];
  snapshot.forEach(doc => {
    data.push(doc.data());
  });
  return data;
};

export class FirestoreDataSource implements DataSource {
  private db: admin.firestore.Firestore;
  private path: string;

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
    if (isEmpty(payload)) {
      return;
    }
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
    const ref = this.db.collection(this.path);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    const oldOwner = first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
    if (oldOwner) {
      const oldRef = this.db.doc(`${this.path}/${(oldOwner as any).id}`);
      await oldRef.update({[foreignKey]: admin.firestore.FieldValue.delete()});
    }

    const newRef = this.db.doc(`${this.path}/${id}`);
    await newRef.update({[foreignKey]: foreignId});
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
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    const ref = this.db.doc(`${relationTableName}/${sourceSideId}`);
    const doc = await ref.get();
    const docData = doc.data();

    return !docData
      ? []
      : isEmpty(docData.targetSideIds)
        ? []
        : Promise.all(docData.targetSideIds.filter(id => !isNil(id)).map(id => this.findOneById(id)));
  }

  public async addIdToManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    const sourceSideRef = this.db.doc(`${relationTableName}/${sourceSideId}`);
    await sourceSideRef.set({
      targetSideIds: admin.firestore.FieldValue.arrayUnion(targetSideId),
    }, { merge: true });
  }

  public async removeIdFromManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    const ref = this.db.doc(`${relationTableName}/${sourceSideId}`);
    await ref.set({
      targetSideIds: admin.firestore.FieldValue.arrayRemove(targetSideId),
    }, { merge: true });
  }

  // Embed relation
  public addEmbedIds(foreignKey: string, ids: string[]): Record<string, true> {
    return reduce(ids, (map, id) => {
      map[`${foreignKey}.${id}`] = true;
      return map;
    }, {});
  }

  public removeEmbedIds(foreignKey: string, ids: string[]): Record<string, true> {
    return reduce(ids, (map, id) => {
      map[`${foreignKey}.${id}`] = admin.firestore.FieldValue.delete();
      return map;
    }, {});
  }

  public async findOneByEmbedId(foreignKey: string, foreignId: string) {
    const ref = this.db.collection(this.path).where(foreignKey, '==', foreignId);
    const snapshot = await ref.get();
    return snapshot.empty ? null : first(snapToArray(snapshot));
  }

  public async findManyByEmbedId(foreignKey: string, foreignId: string) {
    const ref = this.db.collection(this.path).where(foreignKey, '==', foreignId);
    const snapshot = await ref.get();
    return snapshot.empty ? null : snapToArray(snapshot);
  }
}
