import { SdlField, SdlFieldType } from './interface';
import { InputValue } from '../inputValue/interface';
import { defaultTo } from 'lodash';

export default abstract class AbstractSdlField implements SdlField {
  private typename: string;
  private nonNull: boolean;
  private list: boolean;
  private itemNonNull: boolean;
  private description: string;
  private directives: Record<string, Record<string, InputValue>>;

  constructor({
    typename,
    nonNull,
    list,
    itemNonNull,
  }: {
    typename: string,
    nonNull?: boolean,
    list?: boolean,
    itemNonNull?: boolean,
  }) {
    this.typename = typename;
    this.nonNull = defaultTo(nonNull, false);
    this.list = defaultTo(list, false);
    this.itemNonNull = defaultTo(itemNonNull, false);
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

  public getDirectives(): Record<string, Record<string, InputValue<any>>> {
    return this.directives;
  }

  public getTypeName(): string {
    return this.typename;
  }
}
