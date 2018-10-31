// tslint:disable:max-classes-per-file
import AbstractSdlField from './sdlField';
import { SdlFieldType, SdlField } from './interface';

export { SdlFieldType };

export class ScalarField extends AbstractSdlField {
  public getFieldType() {
    return SdlFieldType.SCALAR;
  }
}

export class CustomScalarField extends AbstractSdlField {
  public getFieldType() {
    return SdlFieldType.CUSTOM_SCALAR;
  }
}

export class EnumField extends AbstractSdlField {
  public getFieldType() {
    return SdlFieldType.ENUM;
  }
}

export class ObjectField extends AbstractSdlField {
  private fields: Record<string, SdlField> = {};
  public getFieldType() {
    return SdlFieldType.OBJECT;
  }

  public addField(name: string, field: SdlField) {
    this.fields[name] = field;
  }

  public getFields() {
    return this.fields;
  }
}
