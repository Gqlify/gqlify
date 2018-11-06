// tslint:disable:max-classes-per-file
import SimpleValue from './simpleValue';
import ListValue from './listValue';
// import ObjectValue from './objectValue';
import { Kind } from 'graphql';

export class IntValue extends SimpleValue<number> {
  public getType() {
    return Kind.INT;
  }
}

export class FloatValue extends SimpleValue<number> {
  public getType() {
    return Kind.FLOAT;
  }
}

export class StringValue extends SimpleValue<string> {
  public getType() {
    return Kind.STRING;
  }
}

export class BooleanValue extends SimpleValue<boolean> {
  public getType() {
    return Kind.BOOLEAN;
  }
}

export class NullValue extends SimpleValue<null> {
  constructor() {
    super({
      value: null,
    });
  }

  public getType() {
    return Kind.NULL;
  }

  public getValue() {
    return null;
  }
}

export class EnumValue extends SimpleValue<any> {
  public getType() {
    return Kind.ENUM;
  }
}

export class EmptyValue extends SimpleValue<null> {
  public getType() {
    return null;
  }
}

export { default as ObjectValue } from './objectValue';
export { default as ListValue } from './listValue';
