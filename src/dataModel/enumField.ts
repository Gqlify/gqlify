import Field from './field';
import { DataModelType } from './type';
import EnumType from './fieldType/enumType';

export default class EnumField extends Field {
  private enumType: EnumType;

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
    enumType: EnumType,
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
    return this.enumType.getTypename();
  }

  public getValues() {
    return this.enumType.getValues();
  }
}
