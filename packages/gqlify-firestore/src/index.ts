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
  sort,
  Mutation,
  ArrayOperator
} from '@linkcms/server';

const snapToArray = (snapshot: admin.firestore.QuerySnapshot) => {
  const data = [];
  snapshot.forEach(doc => {
    data.push(doc.data());
  });
  return data;
};

const defaultMapCollection = 'canner-object';

export interface FirestoreOption {
  config?: admin.AppOptions;
  collection?: string;
  // path for map data
  path?: string;
}

export class FirestoreDataSource implements DataSource {
  private db: admin.firestore.Firestore;
  private collection: string;
  private path: string;

  constructor(option: FirestoreOption) {
    this.db = isEmpty(admin.apps)
      ? admin.initializeApp(option.config).firestore()
      : admin.app().firestore();
    this.collection = option.collection;
    // path exists
    if (option.path && option.path.indexOf('/') > 0) {
      this.path = option.path;
    } else if (option.path) {
      this.path = option.path.startsWith('/')
        ? `${defaultMapCollection}${option.path}`
        : `${defaultMapCollection}/${option.path}`;
    }
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const ref = this.db.collection(this.collection);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    const filteredData = sort(filter(data, where), orderBy);
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    const ref = this.db.collection(this.collection);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    return first(filter(data, where));
  }

  public async findOneById(id: string): Promise<any> {
    const ref = this.db.collection(this.collection).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return;
    }
    return doc.data();
  }

  public async create(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    const ref = await this.db.collection(this.collection).add(payload);
    await ref.update({ id: ref.id });
    const doc = await ref.get();
    return doc.data();
  }

  public async update(where: Where, mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    // WARNING: where may not contain id
    if (isEmpty(payload)) {
      return;
    }
    const ref = this.db.collection(this.collection).doc(where.id.eq);
    await ref.update(payload);
  }

  public async delete(where: Where): Promise<any> {
    // WARNING: where may not contain id
    await this.db.collection(this.collection).doc(where.id.eq).delete();
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    const ref = this.db.collection(this.collection);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    return first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<any> {
    const ref = this.db.collection(this.collection);
    const snapshot = await ref.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
    const oldOwner = first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
    if (oldOwner) {
      const oldRef = this.db.doc(`${this.collection}/${(oldOwner as any).id}`);
      await oldRef.update({[foreignKey]: admin.firestore.FieldValue.delete()});
    }

    const newRef = this.db.doc(`${this.collection}/${id}`);
    await newRef.update({[foreignKey]: foreignId});
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    const ref = this.db.collection(this.collection);
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
    const ref = this.db.collection(this.collection).where(foreignKey, '==', foreignId);
    const snapshot = await ref.get();
    return snapshot.empty ? null : first(snapToArray(snapshot));
  }

  public async findManyByEmbedId(foreignKey: string, foreignId: string) {
    const ref = this.db.collection(this.collection).where(foreignKey, '==', foreignId);
    const snapshot = await ref.get();
    return snapshot.empty ? null : snapToArray(snapshot);
  }

  /**
   * Map
   */
  public async getMap(): Promise<Record<string, any>> {
    const snapshot = await this.db.doc(this.path).get();
    return snapshot.data();
  }

  public async updateMap(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    try {
      await this.db.doc(this.path).update(payload);
    } catch (e) {
      if (/No document to update/.test(e.message)) {
        await this.db.doc(this.path).set(payload);
      } else {
        // throw other error
        throw e;
      }
    }
  }

  private transformMutation = (mutation: Mutation) => {
    const payload = mutation.getData();
    mutation.getArrayOperations().forEach(operation => {
      const { fieldName, operator, value } = operation;

      // only deal with set for now
      // add add, remove in following version
      if (operator !== ArrayOperator.set) {
        return;
      }
      payload[fieldName] = value;
    });

    return payload;
  };
}
