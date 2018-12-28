import Field from './field';
import { DataModelType } from './type';
import EnumType from './namedType/enumType';
import { isFunction } from 'lodash';

export type EnumTypeOrThunk = EnumType | (() => EnumType);

export default class EnumField extends Field {
  private enumType: EnumTypeOrThunk;

  constructor({
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    enumType,
  }: {
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    enumType: EnumTypeOrThunk,
  }) {
    super({
      type: DataModelType.ENUM,
      nonNull,
      list,
      nonNullItem,
      unique,
      readOnly,
    });

    this.enumType = enumType;
  }

  public getTypename() {
    // override getTypename to enum typename
    return this.resolveEnumType().getTypename();
  }

  public getValues() {
    return this.resolveEnumType().getValues();
  }

  private resolveEnumType() {
    return isFunction(this.enumType) ? this.enumType() : this.enumType;
  }
}
