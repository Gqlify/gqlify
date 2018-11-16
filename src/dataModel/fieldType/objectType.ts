import { FieldType } from './interface';
import Field from '../field';
import { mapValues, isFunction } from 'lodash';

export default class ObjectType implements FieldType {
  private name: string;
  private fields: Record<string, () => Field | Field>;

  constructor({
    name,
    fields,
  }: {
    name: string,
    fields: Record<string, () => Field | Field>,
  }) {
    this.name = name;
    this.fields = fields;
  }

  public getTypename() {
    return this.name;
  }

  public getFields(): Record<string, Field> {
    return mapValues(this.fields, field => {
      return isFunction(field) ? field() : field;
    });
  }
}
