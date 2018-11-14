import Field from './field';
import { DataModelType } from './type';

export default class EnumField extends Field {
  private enumName: string;
  private values: string[];

  constructor({
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    enumName,
    values,
  }: {
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    enumName: string,
    values: string[],
  }) {
    super({
      type: DataModelType.ENUM,
      nonNull,
      list,
      nonNullItem,
      unique,
      readOnly,
    });

    this.enumName = enumName;
    this.values = values;
  }

  public getTypename() {
    // override getTypename to enum typename
    return this.enumName;
  }

  public getValues() {
    return this.values;
  }
}
