import Field from './field';
import { DataModelType } from './type';
import { capitalize, mapValues, isFunction } from 'lodash';
import ObjectType from './fieldType/objectType';

export default class ObjectField extends Field {
  private objectType: ObjectType;

  constructor({
    nonNull,
    list,
    nonNullItem,
    readOnly,
    objectType,
  }: {
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    readOnly?: boolean,
    objectType: ObjectType,
  }) {
    super({
      type: DataModelType.OBJECT,
      nonNull,
      list,
      nonNullItem,
      readOnly,
    });

    this.objectType = objectType;
  }

  public getFields(): Record<string, Field> {
    return this.objectType.getFields();
  }

  public getTypename() {
    return this.objectType.getTypename();
  }
}
