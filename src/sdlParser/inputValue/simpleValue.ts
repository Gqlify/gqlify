import { InputValue } from './interface';

export default class SimpleValue<ValueType> implements InputValue<ValueType> {
  private value: ValueType;
  constructor({value}: {value: ValueType}) {
    this.value = value;
  }

  public isScalar(): boolean {
    return true;
  }

  public getType(): string {
    return '';
  }

  public getValue() {
    return this.value;
  }
}
