import { Db, FilterQuery } from 'mongodb';
import { first, isEmpty, isUndefined, get, pull, unset, reduce } from 'lodash';

import {
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
  filter,
  paginate,
  iterateWhere,
  Mutation,
  ArrayOperator
} from '@gqlify/server';

const defaultObjectCollection = 'canner-object';

export class MongodbDataSource implements DataSource {
  private db: Db;
  private collectionName: string;
  private objectCollection: string;
  private objectKey: string;
  private relationPath: string = '__relation';

  constructor(db: Db, collectionName: string, key?: string) {
    this.db = db;
    this.collectionName = collectionName;

    // determine object api collection & key
    const splits = this.collectionName.split('/');
    if (splits.length === 1) {
      this.objectCollection = defaultObjectCollection;
      this.objectKey = collectionName;
    } else if (splits.length >= 2) {
      this.objectCollection = splits[0];
      this.objectKey = splits[1];
    }
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const filterQuery = this.whereToFilterQuery(where);

    let query = this.db.collection(this.collectionName).find(filterQuery);
    query = isEmpty(orderBy) ? query : query.sort({ [orderBy.field]: orderBy.value });

    const filteredData = await query.project({ _id: 0 }).toArray();
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    const filteredData = await this.db.collection(this.collectionName)
      .find(filterQuery)
      .project({ _id: 0 })
      .toArray();
    return first(filteredData);
  }

  public async findOneById(id: string): Promise<any> {
    const filteredData = await this.db.collection(this.collectionName)
      .find({ id })
      .project({ _id: 0 })
      .toArray();
    return first(filteredData);
  }

  public async create(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    const insertedItem = await this.db.collection(this.collectionName).insertOne(payload);
    if (insertedItem) {
      const updatedItem = await this.db.collection(this.collectionName).findOneAndUpdate(
        { _id: insertedItem.insertedId },
        {
          $set: {
            id: insertedItem.insertedId.toString(),
          },
        },
        {
          projection: { _id: 0 },
          returnOriginal: false,
        },
      );
      return updatedItem.value;
    }
  }

  public async update(where: Where, mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    const filterQuery = this.whereToFilterQuery(where);
    if (!isEmpty(payload)) {
      await this.db.collection(this.collectionName).updateOne(filterQuery, { $set: payload });
    }
  }

  public async delete(where: Where): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    await this.db.collection(this.collectionName).deleteOne(filterQuery);
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    const data = await this.db.collection(this.collectionName)
      .find({})
      .project({ _id: 0 })
      .toArray();
    return first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<any> {
    // remove oldOwner foreignKey
    await this.db.collection(this.collectionName).findOneAndUpdate(
      { [foreignKey]: foreignId },
      { $unset: { [foreignKey]: '' } },
    );

    // add foreignKey to  newOwner
    await this.db.collection(this.collectionName).findOneAndUpdate(
      { id },
      { $set: { [foreignKey]: foreignId } },
      { returnOriginal: false },
    );
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    const data = await this.db.collection(this.collectionName)
      .find({})
      .project({ _id: 0 })
      .toArray();
    return filter(data, {[foreignKey]: {[Operator.eq]: foreignId}});
  }

  // ManyToManyRelation
  public async findManyFromManyRelation(sourceSideName: string, targetSideName: string, sourceSideId: string) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    const relationData = await this.db.collection(relationTableName).findOne({ sourceSideId });

    const relationIds = (relationData && relationData.targetSideIds)
      ? relationData.targetSideIds
      : [];

    return Promise.all(relationIds.map(id => this.findOneById(id)));
  }

  public async addIdToManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    await this.db.collection(relationTableName).updateOne(
      { sourceSideId },
      {
        $set: {
          sourceSideId,
        },
        $push: {
          targetSideIds: targetSideId,
        },
      },
      { upsert: true },
    );
  }

  public async removeIdFromManyRelation(
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    await this.db.collection(relationTableName).updateOne(
      { sourceSideId },
      {
        $pull: {
          targetSideIds: targetSideId,
        },
      },
    );
  }

  /**
   * Map
   */
  public async getMap(): Promise<Record<string, any>> {
    const filteredData = await this.db.collection(this.objectCollection)
      .findOne({key: this.objectKey});
    return filteredData;
  }

  public async updateMap(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    if (!isEmpty(payload)) {
      await this.db.collection(this.objectCollection)
        .updateOne({key: this.objectKey}, { $set: payload }, { upsert: true });
    }
  }

  private whereToFilterQuery(where: Where): FilterQuery<any> {
    const filterQuery: object = {};
    iterateWhere(where, (field, op, value) => {
      switch (op) {
        case Operator.eq:
          filterQuery[field] = value;
          break;

        case Operator.gt:
          filterQuery[field] = { $gt: value };
          break;

        case Operator.gte:
          filterQuery[field] = { $gte: value };
          break;

        case Operator.lt:
          filterQuery[field] = { $lt: value };
          break;

        case Operator.lte:
          filterQuery[field] = { $lte: value };
          break;
      }
    });

    return filterQuery;
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
