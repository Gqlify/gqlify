import Field from './field';
import { DataModelType } from './type';
import { capitalize, mapValues, isFunction } from 'lodash';

export default class ObjectField extends Field {
  private fields: Record<string, () => Field | Field>;
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
    fields: Record<string, () => Field | Field>,
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

  public getFields(): Record<string, Field> {
    return mapValues(this.fields, field => {
      return isFunction(field) ? field() : field;
    });
  }

  public getTypename() {
    return capitalize(this.typename);
  }
}
