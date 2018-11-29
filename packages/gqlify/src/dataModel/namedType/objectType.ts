import { NamedType } from './interface';
import Field from '../field';

export default class ObjectType implements NamedType {
  private name: string;
  private fields: Record<string, Field>;

  constructor({
    name,
    fields,
  }: {
    name: string,
    fields: Record<string, Field>,
  }) {
    this.name = name;
    this.fields = fields;
  }

  public getTypename() {
    return this.name;
  }

  public getFields() {
    return this.fields;
  }
}
