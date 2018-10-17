import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import Field from '../dataModel/field';
import { GraphqlType } from '../dataModel/type';
import { isEmpty } from 'lodash';

export default class WhereInputPlugin implements Plugin {
  public visitModel(model: Model, context: Context) {
    const { root } = context;

    // add where input
    const modelWhereInputName = this.getWhereInputName(model);
    // add filter: https://www.opencrud.org/#sec-Data-types
    const whereInput = `input ${modelWhereInputName} {
      ${this.createWhereFilter(model.getFields())}
    }`;
    root.addInput(modelWhereInputName, whereInput);

    // add where unique input
    // only use the unique field
    const modelWhereUniqueInputName = this.getWhereUniqueInputName(model);
    const whereUniqueInput = `input ${modelWhereUniqueInputName} {
      ${this.createWhereUniqueFilter(model.getName(), model.getFields())}
    }`;
    root.addInput(modelWhereUniqueInputName, whereUniqueInput);
  }

  public getWhereInputName(model: Model): string {
    return `${model.getNamings().capitalSingular}WhereInput`;
  }

  public getWhereUniqueInputName(model: Model): string {
    return `${model.getNamings().capitalSingular}WhereUniqueInput`;
  }

  private createWhereFilter(fields: Field[]) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string, type: string}> = [];
    fields.forEach(field => {
      switch (field.getType()) {
        case GraphqlType.STRING:
        case GraphqlType.INT:
        case GraphqlType.FLOAT:
        case GraphqlType.ENUM:
        case GraphqlType.ID:
        case GraphqlType.BOOLEAN:
          inputFields.push({
            fieldName: field.getName(),
            type: field.getTypename(),
          });
          break;
      }
    });

    return inputFields.map(({fieldName, type}) => `${fieldName}: ${type}`).join(' ');
  }

  private createWhereUniqueFilter(modelName: string, fields: Field[]) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string, type: string}> = [];
    fields.forEach(field => {
      if (field.isUnique()) {
        inputFields.push({
          fieldName: field.getName(),
          type: field.getTypename(),
        });
      }
    });

    if (isEmpty(fields)) {
      throw new Error(`no unique field find in model ${modelName}`);
    }
    return inputFields.map(({fieldName, type}) => `${fieldName}: ${type}`).join(' ');
  }
}
