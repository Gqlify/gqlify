import { InputValue } from '../inputValue/interface';
import { SdlDirective } from '../interface';

export enum SdlFieldType {
  SCALAR = 'SCALAR',
  CUSTOM_SCALAR = 'CUSTOM_SCALAR',
  ENUM = 'ENUM',
  OBJECT = 'OBJECT',
}

export interface SdlField {
  getTypeName(): string;
  getFieldType(): SdlFieldType;
  isNonNull(): boolean;
  isList(): boolean;
  isItemNonNull(): boolean;
  getDescription(): string;
  getDirective(name: string): SdlDirective;
  getDirectives(): Record<string, SdlDirective>;
}
