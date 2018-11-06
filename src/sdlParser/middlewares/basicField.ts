import { SdlMiddleware } from './interface';
import Model from '../../dataModel/model';
import Field from '../../dataModel/field';
import { SdlField } from '../field/interface';
import SdlObjectType from '../namedType/objectType';

enum RESERVED_DIRECTIVES {
  unique = 'unique',
  readOnly = 'readOnly',
  autoGen = 'autoGen',
}

export default class BasicFieldMiddleware implements SdlMiddleware {
  public visitField?({
    model,
    field,
    sdlObjectType,
    sdlField,
  }: {
    model: Model,
    field: Field,
    sdlObjectType: SdlObjectType,
    sdlField: SdlField,
  }) {
    // detect unique
    const uniqueDirective = sdlField.getDirective(RESERVED_DIRECTIVES.unique);
    if (uniqueDirective) {
      field.setUnique(true);
    }

    // detect readOnly
    const readOnlyDirective = sdlField.getDirective(RESERVED_DIRECTIVES.readOnly);
    if (readOnlyDirective) {
      field.setReadOnly(true);
    }

    // detect autoGen
    const autoGenDirective = sdlField.getDirective(RESERVED_DIRECTIVES.autoGen);
    if (autoGenDirective) {
      field.setAutoGen(true);
    }
  }
}
