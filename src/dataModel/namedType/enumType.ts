import { NamedType } from './interface';

export default class EnumType implements NamedType {
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
