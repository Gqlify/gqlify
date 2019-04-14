// import { initializeApp, credential } from 'firebase-admin';
import * as admin from 'firebase-admin';
import { first, isEmpty, isNil, isUndefined, get, pull, reduce, values } from 'lodash';

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

const snapToArray = (snapshot: admin.database.DataSnapshot) => {
  const rows = [];
  snapshot.forEach(childSnapshot => {
    rows.push(childSnapshot.val());
  });
  return rows;
};

export interface FirebaseOption {
  config?: admin.AppOptions;
  path: string;
}

export class FirebaseDataSource implements DataSource {
  private db: admin.database.Database;
  private path: string;
  private relationPath: string = '__relation';

  constructor(option: FirebaseOption) {
    this.db = isEmpty(admin.apps)
      ? admin.initializeApp(option.config).database()
      : admin.app().database();
    this.path = option.path;
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

  public async create(mutation: Mutation): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    const payload = this.transformMutation(mutation);
    const newItem = await ref.push(payload);
    await newItem.update({ id: newItem.key });
    const snapshot = await this.db.ref(`/${this.path}/${newItem.key}`).once('value');
    return snapshot.val();
  }

  public async update(where: Where, mutation: Mutation): Promise<any> {
    // WARNING: where may not contain id
    const ref = this.db.ref(`/${this.path}`).child(where.id.eq);
    const payload = this.transformMutation(mutation);
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
    const ref = this.db.ref(`/${this.relationPath}/${relationTableName}`);
    const relationTableSnapshot = await ref.once('value');
    const relationTable = relationTableSnapshot.val();
    const ids = (relationTable && relationTable[sourceSideId]) || [];
    return isNil(ids)
      ? []
      : Promise.all(ids.filter(id => !isNil(id)).map(id => this.findOneById(id)));
  }

  public async addIdToManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `${sourceSideName}_${targetSideName}`;

    const relationRef = this.db.ref(`/${this.relationPath}`);
    const relationSnapshot = await relationRef.once('value');
    const relation = relationSnapshot.val();
    if (!relation) {
      await relationRef.set({
        [relationTableName]: {
          [sourceSideId]: [targetSideId],
        },
      });
    }

    const relationTableRef = this.db.ref(`/${this.relationPath}/${relationTableName}`);
    const relationTableSnapshot = await relationTableRef.once('value');
    const relationTable = relationTableSnapshot.val();
    if (!relationTable) {
      await relationRef.update({
        [relationTableName]: {
          [sourceSideId]: [targetSideId],
        },
      });
    }

    const sourceSideIdRef = this.db.ref(`/${this.relationPath}/${relationTableName}/${sourceSideId}`);
    const sourceSideIdSnapshot = await sourceSideIdRef.once('value');
    const relationIds = sourceSideIdSnapshot.val();
    if (!relationIds) {
      await sourceSideIdRef.set([targetSideId]);
    }

    if (relationIds && relationIds.indexOf(targetSideId) === -1) {
      relationIds.push(targetSideId);
      await sourceSideIdRef.set(relationIds);
    }
  }

  public async removeIdFromManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    const ref = this.db.ref(`/${this.relationPath}/${relationTableName}`);
    const relationTableSnapshot = await ref.once('value');
    const relationTable = relationTableSnapshot.val();
    if (!relationTable || isUndefined(relationTable[sourceSideId])) {
      return;
    }

    // remove Id and save result in relationIds
    const relationIds = relationTable[sourceSideId];
    pull(relationIds, targetSideId);

    // overwrite relationIds value of relationTable[sourceSideId]
    const sourceSideIdRef = ref.child(sourceSideId);
    await sourceSideIdRef.set(relationIds);
  }

  // Embed relation
  public addEmbedIds(foreignKey: string, ids: string[]): Record<string, true> {
    return reduce(ids, (map, id) => {
      map[`/${foreignKey}/${id}`] = true;
      return map;
    }, {});
  }

  public removeEmbedIds(foreignKey: string, ids: string[]): Record<string, true> {
    return reduce(ids, (map, id) => {
      map[`/${foreignKey}/${id}`] = null;
      return map;
    }, {});
  }

  public async findOneByEmbedId(foreignKey: string, foreignId: string) {
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.orderByChild(`${foreignKey}/${foreignId}`).equalTo(true).once('value');
    return snapshot.exists() ? first(values(snapshot.val())) : null;
  }

  public async findManyByEmbedId(foreignKey: string, foreignId: string) {
    const ref = this.db.ref(`/${this.path}`);
    const snapshot = await ref.orderByChild(`${foreignKey}/${foreignId}`).equalTo(true).once('value');
    return snapshot.exists() ? snapToArray(snapshot) : [];
  }

  /**
   * Map
   */

  public async getMap(): Promise<Record<string, any>> {
    const snapshot = await this.db.ref(`/${this.path}`).once('value');
    return snapshot.val();
  }

  public async updateMap(mutation: Mutation): Promise<any> {
    const ref = this.db.ref(`/${this.path}`);
    const payload = this.transformMutation(mutation);
    await ref.update(payload);
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
