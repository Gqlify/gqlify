import { SdlMiddleware } from './interface';
import Model from '../../dataModel/model';
import Field from '../../dataModel/field';
import { SdlField } from '../field/interface';
import SdlObjectType from '../namedType/objectType';
import { forEach, mapValues } from 'lodash';

// put all directives into model & field metadata
export default class MetadataMiddleware implements SdlMiddleware {
  public visitGqlifyModel({
    model,
    sdlObjectType,
  }: {
    model: Model,
    sdlObjectType: SdlObjectType,
  }) {
    forEach(sdlObjectType.getDirectives(), (directive, key) => {
      model.setMetadata(key, mapValues(directive.args, arg => arg.getValue()));
    });
  }

  public visitField({
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
    forEach(sdlField.getDirectives(), (directive, key) => {
      field.setMetadata(key, mapValues(directive.args, arg => arg.getValue()));
    });
  }
}
