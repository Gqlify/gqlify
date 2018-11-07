import { SdlDirective } from '../interface';
import { SdlNamedType } from './interface';

export default class SdlEnumType implements SdlNamedType {
  private name: string;
  private description: string;
  private directives: Record<string, SdlDirective>;
  private values: string[];

  constructor({
    name,
    description,
    directives,
    values,
  }: {
    name: string,
    description?: string,
    directives?: Record<string, SdlDirective>,
    values: string[],
  }) {
    this.name = name;
    this.description = description;
    this.directives = directives;
    this.values = values;
  }

  public getName() {
    return this.name;
  }

  public getDescription() {
    return this.description;
  }

  public getDirectives() {
    return this.directives;
  }

  public getValues() {
    return this.values;
  }
}
