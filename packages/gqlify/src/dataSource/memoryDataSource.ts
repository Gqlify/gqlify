import {
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
} from './interface';
import { filter, createFilter, paginate, sort } from '../helper';
import { first, last, assign, remove, isNil, isUndefined, get, pull, unset } from 'lodash';

export default class MemoryDataSource implements DataSource {
  private defaultData: any[];
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor(defaultData?: any[]) {
    this.defaultData = defaultData || [];
  }

  public find = async (args?: ListFindQuery): Promise<PaginatedResponse> => {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const filteredData = sort(filter(this.defaultData, where), orderBy);
    return paginate(filteredData, pagination);
  };

  public findOne = async ({ where }: { where: Where }): Promise<any> => {
    return first(filter(this.defaultData, where));
  };

  public findOneById = async (id: string): Promise<any> => {
    return first(filter(this.defaultData, {id: {[Operator.eq]: id}}));
  };

  public create = async (payload: any): Promise<any> => {
    const lastRecord = last(this.defaultData);
    const nextId = lastRecord ? parseInt(lastRecord.id, 10) + 1 : 0;
    payload.id = nextId.toString();
    this.defaultData.push(payload);
    return payload;
  };

  public update = async (where: Where, payload: any): Promise<any> => {
    const user = first(filter(this.defaultData, where));
    assign(user, payload);
  };

  public delete = async (where: Where): Promise<any> => {
    const target = first(filter(this.defaultData, where));
    remove(this.defaultData, row => row === target);
  };

  // ToOneRelation
  public findOneByRelation = async (foreignKey: string, foreignId: string): Promise<any> => {
    return first(filter(this.defaultData, {[foreignKey]: {[Operator.eq]: foreignId}}));
  };

  // ToOneRelation
  public updateOneRelation = async (id: string, foreignKey: string, foreignId: string): Promise<any> => {
    const oldOwner = first(filter(this.defaultData, {[foreignKey]: {[Operator.eq]: foreignId}}));
    unset(oldOwner, foreignKey);

    const newOwner = first(filter(this.defaultData, { id: { [Operator.eq]: id } }));
    assign(newOwner, { [foreignKey]: foreignId });
  };

  // OneToManyRelation
  public findManyFromOneRelation = async (foreignKey: string, foreignId: string): Promise<any[]> => {
    return filter(this.defaultData, {[foreignKey]: {[Operator.eq]: foreignId}});
  };

  // ManyToManyRelation
  public findManyFromManyRelation = async (sourceSideName: string, targetSideName: string, sourceSideId: string) => {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    const ids = get(this.relationTable, [relationTableName, sourceSideId]) || [];
    return isNil(ids)
      ? []
      : ids.filter(id => !isNil(id)).map(id => this.findOneById(id));
  };

  public addIdToManyRelation = async (
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) => {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    if (!this.relationTable[relationTableName]) {
      this.relationTable[relationTableName] = {[sourceSideId]: []};
    }

    if (isUndefined(this.relationTable[relationTableName][sourceSideId])) {
      this.relationTable[relationTableName][sourceSideId] = [];
    }

    this.relationTable[relationTableName][sourceSideId].push(targetSideId);
  };

  public removeIdFromManyRelation = async (
    sourceSideName: string, targetSideName: string, sourceSideId: string, targetSideId: string) => {
    const relationTableName = `${sourceSideName}_${targetSideName}`;
    if (!this.relationTable[relationTableName] ||
      isUndefined(this.relationTable[relationTableName][sourceSideId])) {
      return;
    }

    pull(this.relationTable[relationTableName][sourceSideId], targetSideId);
  };
}
