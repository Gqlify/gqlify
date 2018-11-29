import { InputValue } from './interface';
import { Kind } from 'graphql';

export default class ListValue implements InputValue<InputValue[]> {
  private values: Array<InputValue<any>>;
  constructor({values}: {values: Array<InputValue<any>>}) {
    this.values = values;
  }

  public isScalar() {
    return false;
  }

  public getType() {
    return Kind.LIST;
  }

  public getValue(): Array<InputValue<any>> {
   return this.values;
  }
}
