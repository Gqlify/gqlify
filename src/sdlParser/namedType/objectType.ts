import { SdlField } from '../field/interface';
import { SdlDirective } from '../interface';
import { SdlNamedType } from './interface';

export default class SdlObjectType implements SdlNamedType {
  private name: string;
  private description: string;
  private interfaces: string[];
  private directives: Record<string, SdlDirective>;
  private fields: Record<string, SdlField>;

  constructor({
    name,
    description,
    interfaces,
    directives,
    fields,
  }: {
    name: string,
    description?: string,
    interfaces?: string[],
    directives?: Record<string, SdlDirective>,
    fields?: Record<string, SdlField>,
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

  public getField(name: string) {
    return this.fields[name];
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
