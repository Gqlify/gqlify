import { SdlField, SdlFieldType } from './interface';
import { InputValue } from '../inputValue/interface';
import { defaultTo } from 'lodash';
import { SdlDirective } from '../interface';

export default abstract class AbstractSdlField implements SdlField {
  private typename: string;
  private nonNull: boolean;
  private list: boolean;
  private itemNonNull: boolean;
  private description: string;
  private directives: Record<string, SdlDirective>;

  constructor({
    typename,
    nonNull,
    list,
    itemNonNull,
    directives,
  }: {
    typename: string,
    nonNull?: boolean,
    list?: boolean,
    itemNonNull?: boolean,
    directives?: Record<string, SdlDirective>,
  }) {
    this.typename = typename;
    this.nonNull = defaultTo(nonNull, false);
    this.list = defaultTo(list, false);
    this.itemNonNull = defaultTo(itemNonNull, false);
    this.directives = directives || {};
  }

  public abstract getFieldType(): SdlFieldType;

  public isNonNull(): boolean {
    return this.nonNull;
  }

  public isList(): boolean {
    return this.list;
  }

  public isItemNonNull(): boolean {
    return this.itemNonNull;
  }

  public getDescription(): string {
    return this.description;
  }

  public getDirective(name: string): SdlDirective {
    return this.directives[name];
  }

  public getDirectives(): Record<string, SdlDirective> {
    return this.directives;
  }

  public getTypeName(): string {
    return this.typename;
  }
}
