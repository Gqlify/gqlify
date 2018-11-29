// tslint:disable:max-classes-per-file
import AbstractSdlField from './sdlField';
import { SdlFieldType, SdlField } from './interface';
import SdlObjectType from '../namedType/objectType';
import SdlEnumType from '../namedType/enumType';

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
  private enumTypeThunk: () => SdlEnumType;
  public getFieldType() {
    return SdlFieldType.ENUM;
  }

  public setEnumType(enumTypeThunk: () => SdlEnumType) {
    this.enumTypeThunk = enumTypeThunk;
  }

  public getEnumType() {
    return this.enumTypeThunk();
  }
}

export class ObjectField extends AbstractSdlField {
  private objectTypeThunk: () => SdlObjectType;
  public getFieldType() {
    return SdlFieldType.OBJECT;
  }

  public setObjectType(objectTypeThunk: () => SdlObjectType) {
    this.objectTypeThunk = objectTypeThunk;
  }

  public getObjectType() {
    return this.objectTypeThunk();
  }
}
