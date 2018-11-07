import Field from './field';
import { DataModelType } from './type';

export default class ScalarField extends Field {
  constructor({
    name,
    type,
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    autoGen,
  }: {
    name: string,
    type: DataModelType,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    autoGen?: boolean,
  }) {
    super({
      name,
      type,
      nonNull,
      list,
      nonNullItem,
      unique,
      readOnly,
      autoGen,
    });
  }
}
