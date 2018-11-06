import { InputValue } from '../inputValue/interface';
import { SdlField } from '../field/interface';

export default class SdlObjectType {
  private name: string;
  private description: string;
  private interfaces: string[];
  private directives: Record<string, InputValue>;
  private fields: SdlField[];

  constructor({
    name,
    description,
    interfaces,
    directives,
    fields,
  }: {
    name: string,
    description: string,
    interfaces: string[],
    directives: Record<string, InputValue>,
    fields: SdlField[],
  }) {
    this.name = name;
    this.description = description;
    this.interfaces = interfaces;
    this.directives = directives;
    this.fields = fields;
  }

  public getName() {
    return this.name;
  }

  public getFields() {
    return this.fields;
  }

  public getDescription() {
    return this.description;
  }

  public getInterfaces() {
    return this.interfaces;
  }

  public getDirectives() {
    return this.directives;
  }
}
