
export interface InputValue<ValueType = any> {
  isScalar(): boolean;
  getType(): string;
  getValue(): ValueType;
}
