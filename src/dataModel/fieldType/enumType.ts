import { FieldType } from './interface';

export default class EnumType implements FieldType {
  private name: string;
  private values: string[];

  constructor({name, values}: {name: string, values: string[]}) {
    this.name = name;
    this.values = values;
  }

  public getTypename() {
    return this.name;
  }

  public getValues() {
    return this.values;
  }
}
