import {Db, FilterQuery} from 'mongodb';
import moment from 'moment-timezone';
import {
  first,
  isEmpty,
  isUndefined,
  get,
  pull,
  unset,
  reduce,
  forEach
} from 'lodash';

import _ from 'lodash';

import flatten from 'flat';

import {
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
  paginate,
  iterateWhere,
  Mutation,
  ArrayOperator
} from '@linkcms/server';

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

  public getDb() {
    return this.db.collection(this.collectionName);
  }

  private getAggregationForFind({filterQuery, orderBy}) {
    let nearFilter = undefined;

    _.forEach(filterQuery, (f, key) => {
      if (f['$near']) {
        let near = _.cloneDeep(f['$near']['$geometry']);
        delete f['$near']['$geometry'];
        nearFilter = {
          $geoNear: {
            ..._.cloneDeep(f['$near']),
            near: near,
            key: key,
            spherical: true,
            distanceField: 'distance'
          }
        };
        delete f['$near'];

        if (isEmpty(f)) {
          delete filterQuery[key];
        }

        return false;
      }
    });

    let stages = [];
    if (nearFilter) {
      stages.push(nearFilter);
    }

    let match = {
      $match: {}
    };

    _.forEach(filterQuery, (f, key) => {
      match['$match'][key] = f;
    });

    stages.push(match);

    if (!isEmpty(orderBy)) {
      stages.push({
        $sort: {
          [orderBy.field]: orderBy.value
        }
      });
    }
    //console.log(JSON.stringify(stages));
    return stages;

    //let aggregation = reduce(filterQuery, (agg, filter))
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const {pagination, where, orderBy = {}} = args || ({} as any);
    const filterQuery = this.whereToFilterQuery(where);
    let stages = this.getAggregationForFind({
      filterQuery,
      orderBy
    });

    //let query = this.db.collection(this.collectionName).find(filterQuery);
    let query = this.db.collection(this.collectionName).aggregate(stages);

    // query = isEmpty(orderBy)
    //   ? query
    //   : query.sort({[orderBy.field]: orderBy.value});

    const filteredData = await query.project({_id: 0}).toArray();
    return paginate(filteredData, pagination);
  }

  public async findOne({where}: {where: Where}): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    const filteredData = await this.db
      .collection(this.collectionName)
      .find(filterQuery)
      .project({_id: 0})
      .toArray();
    return first(filteredData);
  }

  public async findOneById(id: string): Promise<any> {
    const filteredData = await this.db
      .collection(this.collectionName)
      .find({id})
      .project({_id: 0})
      .toArray();
    return first(filteredData);
  }

  public async create(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    const insertedItem = await this.db
      .collection(this.collectionName)
      .insertOne(payload);
    if (insertedItem) {
      const updatedItem = await this.db
        .collection(this.collectionName)
        .findOneAndUpdate(
          {_id: insertedItem.insertedId},
          {
            $set: {
              id: insertedItem.insertedId.toString()
            }
          },
          {
            projection: {_id: 0},
            returnOriginal: false
          }
        );
      return updatedItem.value;
    }
  }

  public async update(where: Where, mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    const filterQuery = this.whereToFilterQuery(where);
    if (!isEmpty(payload)) {
      await this.db
        .collection(this.collectionName)
        .updateOne(filterQuery, {$set: payload});
    }
  }

  public async delete(where: Where): Promise<any> {
    const filterQuery = this.whereToFilterQuery(where);
    await this.db.collection(this.collectionName).deleteOne(filterQuery);
  }

  // ToOneRelation
  public async findOneByRelation(
    foreignKey: string,
    foreignId: string
  ): Promise<any> {
    const data = await this.db
      .collection(this.collectionName)
      .find({
        [foreignKey]: foreignId
      })
      .project({_id: 0})
      .toArray();
    return data; //first(filter(data, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // ToOneRelation
  public async updateOneRelation(
    id: string,
    foreignKey: string,
    foreignId: string
  ): Promise<any> {
    // remove oldOwner foreignKey
    await this.db
      .collection(this.collectionName)
      .findOneAndUpdate(
        {[foreignKey]: foreignId},
        {$unset: {[foreignKey]: ''}}
      );

    // add foreignKey to  newOwner
    await this.db
      .collection(this.collectionName)
      .findOneAndUpdate(
        {id},
        {$set: {[foreignKey]: foreignId}},
        {returnOriginal: false}
      );
  }

  // OneToManyRelation
  public async findManyFromOneRelation(
    foreignKey: string,
    foreignId: string
  ): Promise<any[]> {
    const data = await this.db
      .collection(this.collectionName)
      .find({
        [foreignKey]: foreignId
      })
      .project({_id: 0})
      .toArray();
    return data; //filter(data, {[foreignKey]: {[Operator.eq]: foreignId}});
  }

  // ManyToManyRelation
  public async findManyFromManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string
  ) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    const relationData = await this.db
      .collection(relationTableName)
      .findOne({sourceSideId});

    const relationIds =
      relationData && relationData.targetSideIds
        ? relationData.targetSideIds
        : [];

    let where = reduce(
      relationIds,
      (val, id) => {
        val.push({
          id
        });

        return val;
      },
      []
    );

    if (where.length) {
      return this.db
        .collection(this.collectionName)
        .find({$or: where})
        .project({_id: 0})
        .toArray();
    } else {
      return [];
    }
  }

  public async addIdToManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string,
    targetSideId: string
  ) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    await this.db.collection(relationTableName).updateOne(
      {sourceSideId},
      {
        $set: {
          sourceSideId
        },
        $push: {
          targetSideIds: targetSideId
        }
      },
      {upsert: true}
    );
  }

  public async removeIdFromManyRelation(
    sourceSideName: string,
    targetSideName: string,
    sourceSideId: string,
    targetSideId: string
  ) {
    const relationTableName = `_${sourceSideName}_${targetSideName}`;
    await this.db.collection(relationTableName).updateOne(
      {sourceSideId},
      {
        $pull: {
          targetSideIds: targetSideId
        }
      }
    );
  }

  /**
   * Map
   */
  public async getMap(): Promise<Record<string, any>> {
    const filteredData = await this.db
      .collection(this.objectCollection)
      .findOne({key: this.objectKey});
    return filteredData;
  }

  public async updateMap(mutation: Mutation): Promise<any> {
    const payload = this.transformMutation(mutation);
    if (!isEmpty(payload)) {
      await this.db
        .collection(this.objectCollection)
        .updateOne({key: this.objectKey}, {$set: payload}, {upsert: true});
    }
  }

  private setFilter(field: string, value, filterQuery) {
    filterQuery[field] = {
      ...(filterQuery[field] || {}),
      ...value
    };
    return filterQuery;
  }

  private whereToFilterQuery(where: Where): FilterQuery<any> {
    const filterQuery: object = {};
    iterateWhere(where, (field, op, value) => {
      switch (op) {
        case Operator.or:
          var json = JSON.parse(value || '');
          if (Array.isArray(json)) {
            this.setFilter(field, {$in: json}, filterQuery);
          }

          break;
        case Operator.json:
          var json = JSON.parse(value || '');
          let flat = flatten({
            [field]: json
          });

          forEach(flat, (v, k) => {
            filterQuery[k] = v;
          });

          break;
        case Operator.eq:
          this.setFilter(field, {$eq: value}, filterQuery);

          break;
        case Operator.regex:
          this.setFilter(field, {$regex: value, $options: 'i'}, filterQuery);

          break;
        case Operator.neq:
          this.setFilter(field, {$not: value}, filterQuery);

          break;
        case Operator.near:
          this.setFilter(
            field,
            {
              $near: {
                $geometry: {type: value.type, coordinates: value.coordinates},
                $maxDistance: value.max,
                $minDistance: value.min
              }
            },
            filterQuery
          );

          break;
        case Operator.gt:
          this.setFilter(field, {$gt: value}, filterQuery);
          break;

        case Operator.gte:
          this.setFilter(field, {$gte: value}, filterQuery);

          break;

        case Operator.lt:
          this.setFilter(field, {$lt: value}, filterQuery);

          break;

        case Operator.lte:
          this.setFilter(field, {$lte: value}, filterQuery);

          break;
      }
    });

    console.log(filterQuery);

    return filterQuery;
  }

  private transformMutation = (mutation: Mutation) => {
    const payload = mutation.getData();
    mutation.getArrayOperations().forEach(operation => {
      const {fieldName, operator, value} = operation;

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
