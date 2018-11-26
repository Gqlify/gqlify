import {
  ListReadable,
  ListMutable,
  Where,
  PaginatedResponse,
  ListFindQuery,
  Operator,
  DataSource,
} from '../../src/dataSource/interface';
import { filter, createFilter, paginate, sort } from '../../src/helper';
import { first, last, assign, remove, isUndefined, get, pull } from 'lodash';

export default class MemoryDataSource implements DataSource {
  private defaultData: any[];
  private relationTable: Record<string, Record<string, string[]>> = {};

  constructor(defaultData: any[]) {
    this.defaultData = defaultData;
  }

  public async find(args?: ListFindQuery): Promise<PaginatedResponse> {
    const { pagination, where, orderBy = {} } = args || {} as any;
    const filteredData = sort(filter(this.defaultData, where), orderBy);
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    return first(filter(this.defaultData, where));
  }

  public async findOneById(id: string): Promise<any> {
    return first(filter(this.defaultData, {id: {[Operator.eq]: id}}));
  }

  public async create(payload: any): Promise<any> {
    payload.id = last(this.defaultData).id + 1;
    this.defaultData.push(payload);
  }

  public async update(where: Where, payload: any): Promise<any> {
    const user = first(filter(this.defaultData, where));
    assign(user, payload);
  }

  public async delete(where: Where): Promise<any> {
    const rmFilter = createFilter(where);
    this.defaultData = remove(this.defaultData, rmFilter);
  }

  // ToOneRelation
  public async findOneByRelation(foreignKey: string, foreignId: string): Promise<any> {
    return first(filter(this.defaultData, {[foreignKey]: {[Operator.eq]: foreignId}}));
  }

  // OneToManyRelation
  public async findManyFromOneRelation(foreignKey: string, foreignId: string): Promise<any[]> {
    return filter(this.defaultData, {[foreignKey]: {[Operator.eq]: foreignId}});
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
