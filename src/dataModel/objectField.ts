import Field from './field';
import { DataModelType } from './type';
import { capitalize } from 'lodash';

export default class ObjectField extends Field {
  private fields: Record<string, Field>;
  private typename?: string;

  constructor({
    typename,
    fields,
    nonNull,
    list,
    nonNullItem,
    readOnly,
  }: {
    typename?: string,
    fields: Record<string, Field>,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    readOnly?: boolean,
  }) {
    super({
      type: DataModelType.OBJECT,
      nonNull,
      list,
      nonNullItem,
      readOnly,
    });

    this.fields = fields;
    this.typename = typename;
  }

  public getFields() {
    return this.fields;
  }

  public getTypename() {
    return capitalize(this.typename);
  }
}
