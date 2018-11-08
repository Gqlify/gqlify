import { InputValue } from './inputValue/interface';

export interface SdlDirective {
  args: Record<string, InputValue>;
}
