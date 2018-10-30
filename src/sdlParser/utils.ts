import { ValueNode, Kind } from 'graphql';
import {
  IntValue,
  FloatValue,
  StringValue,
  BooleanValue,
  EnumValue,
  NullValue,
  ListValue,
  ObjectValue
} from './inputValue';
import { InputValue } from './inputValue/interface';
import { reduce } from 'lodash';

export const parseDirective = (node: ValueNode): InputValue => {
  switch (node.kind) {
    case Kind.INT:
      return new IntValue({value: parseInt(node.value, 10)});

    case Kind.FLOAT:
      return new FloatValue({value: parseFloat(node.value)});

    case Kind.STRING:
      return new StringValue({value: node.value});

    case Kind.BOOLEAN:
      return new BooleanValue({value: node.value});

    case Kind.ENUM:
      return new EnumValue({value: node.value});

    case Kind.NULL:
      return new NullValue();

    case Kind.LIST:
      const values = node.values.map(nestedNode => parseDirective(nestedNode));
      return new ListValue({values});

    case Kind.OBJECT:
      const fields = reduce(node.fields, (result, field) => {
        result[field.name.value] = parseDirective(field.value);
        return result;
      }, {});
      return new ObjectValue({fields});

    // all the scalars
    default:
      throw new Error(`not supported type in directive parsing: ${node.kind}`);
  }
};
