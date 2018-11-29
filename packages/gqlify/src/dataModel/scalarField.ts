import Field from './field';
import { DataModelType } from './type';

export default class ScalarField extends Field {
  constructor({
    type,
    nonNull,
    list,
    nonNullItem,
    unique,
    readOnly,
    autoGen,
  }: {
    type: DataModelType,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    unique?: boolean,
    readOnly?: boolean,
    autoGen?: boolean,
  }) {
    super({
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
