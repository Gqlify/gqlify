import Field from './field';
import { DataModelType } from './type';
import { capitalize } from 'lodash';

export default class ObjectField extends Field {
  private fields: Field[];
  private typename?: string;

  constructor({
    name,
    typename,
    fields,
    nonNull,
    list,
    nonNullItem,
    readOnly,
  }: {
    name: string,
    typename?: string,
    fields: Field[],
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    readOnly?: boolean,
  }) {
    super({
      name,
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
    // if typename specified of object, use it, otherwise use the name
    return capitalize(this.typename || this.name);
  }
}
