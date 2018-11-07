import { SdlDirective } from '../interface';

export interface SdlNamedType {
  getName(): string;
  getDescription(): string;
  getDirectives(): Record<string, SdlDirective>;
}
