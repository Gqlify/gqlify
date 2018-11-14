import Field from './field';
import Model from './model';
import { DataModelType } from './type';
import { isFunction } from 'lodash';

export type ModelOrThunk = Model | (() => Model);

export default class RelationField extends Field {
  private relationTo: ModelOrThunk;

  constructor({
    relationTo,
    nonNull,
    list,
    nonNullItem,
    readOnly,
  }: {
    relationTo: ModelOrThunk,
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
  }

  public getTypename() {
    // typename of relationField should refer to the model relation to
    return this.getRelationTo().getTypename();
  }

  public getRelationTo() {
    return isFunction(this.relationTo) ? this.relationTo() : this.relationTo;
  }

  public getFields() {
    return this.getRelationTo().getFields();
  }
}
