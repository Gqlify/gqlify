import Model from '../../dataModel/model';
import Field from '../../dataModel/field';
import SdlObjectType from '../namedType/objectType';
import { SdlField } from '../field/interface';

export interface SdlMiddleware {
  visitApiObjectType?({
    model,
    sdlObjectType,
  }: {
    model: Model,
    sdlObjectType: SdlObjectType,
  });

  visitField?({
    model,
    field,
    sdlObjectType,
    sdlField,
  }: {
    model: Model,
    field: Field,
    sdlObjectType: SdlObjectType,
    sdlField: SdlField,
  });

  visitObjectType?(objectType: SdlObjectType);
}
