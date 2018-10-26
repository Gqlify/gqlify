import {
  ListReadable,
  ListMutable,
  Pagination,
  OrderBy,
  Where,
  PaginatedResponse
} from '../../src/dataSource/interface';
import { filter, createFilter } from '../../src/helper/filter';
import { paginate } from '../../src/helper/paginator';
import { sort } from '../../src/helper/sort';
import { first, last, assign, remove } from 'lodash';

export default class MemoryApi implements ListReadable, ListMutable {
  private defaultData: any[];

  constructor(defaultData: any[]) {
    this.defaultData = defaultData;
  }

  public async find({ pagination, where, orderBy }:
    { pagination?: Pagination; where?: Where; orderBy?: OrderBy; }): Promise<PaginatedResponse> {
    const filteredData = sort(filter(this.defaultData, where), orderBy.field, orderBy.value);
    return paginate(filteredData, pagination);
  }

  public async findOne({ where }: { where: Where }): Promise<any> {
    return first(filter(this.defaultData, where));
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
}
