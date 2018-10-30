import { InputValue } from './inputValue/interface';

export default class SdlType {
  private name: string;
  private description: string;
  private interfaces: string[];
  private directives: Record<string, InputValue>;

  constructor({
    name,
    description,
    interfaces,
    directives,
  }: {
    name: string,
    description: string,
    interfaces: string[],
    directives: Record<string, InputValue>,
  }) {
    this.name = name;
    this.description = description;
    this.interfaces = interfaces;
    this.directives = directives;
  }

  public getName() {
    return this.name;
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
