import Field from './field';
import Model from './model';
import { DataModelType } from './type';
import { isFunction } from 'lodash';

export type ModelOrThunk = Model | (() => Model);
export type RelationConfigOrThunk = Record<string, any> | (() => Record<string, any>);

export default class RelationField extends Field {
  private relationTo: ModelOrThunk;
  private relationConfig?: RelationConfigOrThunk;
  private relationName?: string;

  constructor({
    relationTo,
    relationConfig,
    nonNull,
    list,
    nonNullItem,
    readOnly,
  }: {
    relationTo: ModelOrThunk,
    relationConfig?: RelationConfigOrThunk,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    readOnly?: boolean,
  }) {
    super({
      type: DataModelType.RELATION,
      nonNull,
      list,
      nonNullItem,
      readOnly,
    });

    this.relationTo = relationTo;
    this.relationConfig = relationConfig;
  }

  public getTypename() {
    // typename of relationField should refer to the model relation to
    return this.getRelationTo().getTypename();
  }

  public getRelationTo() {
    return isFunction(this.relationTo) ? this.relationTo() : this.relationTo;
  }

  public getRelationConfig() {
    if (!this.relationConfig) {
      return {};
    }
    return isFunction(this.relationConfig) ? this.relationConfig() : this.relationConfig;
  }

  public getFields() {
    return this.getRelationTo().getFields();
  }

  public getRelationName() {
    return this.relationName;
  }

  public setRelationName(name: string) {
    this.relationName = name;
  }
}
