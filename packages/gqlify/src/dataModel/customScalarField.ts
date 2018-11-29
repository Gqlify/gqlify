import Field from './field';
import { DataModelType } from './type';

export default class CustomScalarField extends Field {
  private typename: string;

  constructor({
    typename,
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    autoGen,
  }: {
    typename: string,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    autoGen?: boolean,
  }) {
    super({
      type: DataModelType.CUSTOM_SCALAR,
      nonNull,
      list,
      nonNullItem,
      unique,
      readOnly,
      autoGen,
    });

    this.typename = typename;
  }

  public getTypename() {
    // override getTypename to custom scalar type
    return this.typename;
  }
}
