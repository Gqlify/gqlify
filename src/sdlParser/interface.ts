import { InputValue } from './inputValue/interface';

export interface SdlDirective {
  name: string;
  args: Record<string, InputValue>;
}
