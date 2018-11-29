import { InputValue } from './interface';
import { Kind } from 'graphql';

export default class ObjectValue implements InputValue<Record<string, InputValue>> {
  private fields: Record<string, InputValue>;
  constructor({fields}: {fields: Record<string, InputValue>}) {
    this.fields = fields;
  }

  public isScalar() {
    return false;
  }

  public getType() {
    return Kind.OBJECT;
  }

  public getValue(): Record<string, InputValue> {
   return this.fields;
  }
}
