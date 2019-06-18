import {MongoClient, Db} from 'mongodb';
import {DataSource} from '@linkcms/server';

import {MongodbDataSource} from './mongodbDataSource';
import ActivityLogManager from './ActivityLogManager';

export {ActivityLogManager};

export interface DataSourceGroup {
  initialize(): Promise<void>;
  getDataSource(collectionName: string): DataSource;
}

export class MongodbDataSourceGroup implements DataSourceGroup {
  private uri: string;
  private dbName: string;
  private db: Db;

  public getDb() {
    return this.db;
  }

  constructor(uri: string, dbName: string) {
    this.uri = uri;
    this.dbName = dbName;
  }

  public async initialize() {
    const mongoClient = await MongoClient.connect(this.uri);
    this.db = mongoClient.db(this.dbName);
  }

  public getDataSource(collectionName: string) {
    if (!this.db) {
      throw Error('Please initialize mongoDB data source group first.');
    }
    return new MongodbDataSource(this.db, collectionName);
  }
}
