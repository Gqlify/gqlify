import { InputValue } from '../inputValue/interface';

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
  getDirectives(): Record<string, Record<string, InputValue>>;
}
