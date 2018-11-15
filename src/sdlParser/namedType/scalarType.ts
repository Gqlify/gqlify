import { SdlNamedType } from './interface';
import { SdlDirective } from '../interface';

export default class SdlScalarType implements SdlNamedType {
  private name: string;
  private description: string;
  private directives: Record<string, SdlDirective>;

  constructor({name, description, directives}:
    {name: string, description?: string, directives?: Record<string, SdlDirective>}) {
    this.name = name;
    this.description = description;
    this.directives = this.directives || {};
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
}
