import { MongoClient, Db, FilterQuery } from 'mongodb';
import { first, isEmpty, isUndefined, get, pull } from 'lodash';

import {
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
  filter,
  paginate,
  iterateWhere
} from '@gqlify/server';

export default class MongodbDataSource implements DataSource {
  private db: Db;
  private collectionName: string;
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor(uri: string, dbName: string, collectionName: string) {
    MongoClient.connect(uri, (err, client) => {
      this.db = client.db(dbName);
    });
    this.collectionName = collectionName;
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const filterQuery = this.whereToFilterQuery(where);

    let query = this.db.collection(this.collectionName).find(filterQuery);
    query = isEmpty(orderBy) ? query : query.sort({ [orderBy.field]: orderBy.value });

    const filteredData = await query.toArray();
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    const filteredData = await this.db.collection(this.collectionName).find(filterQuery).toArray();
    return first(filteredData);
  }

  public async findOneById(id: string): Promise<any> {
    const filteredData = await this.db.collection(this.collectionName).find({ _id: id }).toArray();
    return first(filteredData);
  }

  public async create(payload: any): Promise<any> {
    return this.db.collection(this.collectionName).insertOne(payload);
  }

  public async update(where: Where, payload: any): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    await this.db.collection(this.collectionName).updateOne(filterQuery, { $set: payload });
  }

  public async delete(where: Where): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    await this.db.collection(this.collectionName).deleteOne(filterQuery);
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    const data = await this.db.collection(this.collectionName).find({}).toArray();
    return first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(id: string, foreignKey: string, foreignId: string): Promise<any> {
    throw Error('Not Implement');
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    const data = await this.db.collection(this.collectionName).find({}).toArray();
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
}
