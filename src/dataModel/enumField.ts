import Field from './field';
import { GraphqlType } from './type';

export default class EnumField extends Field {
  private enumName: string;
  private values: string[];

  constructor({
    name,
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    enumName,
    values,
  }: {
    name: string,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    enumName: string,
    values: string[],
  }) {
    super({
      name,
      type: GraphqlType.ENUM,
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
