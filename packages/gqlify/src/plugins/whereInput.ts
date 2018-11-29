import Model from '../dataModel/model';
import { Context, Plugin } from './interface';
import Field from '../dataModel/field';
import { DataModelType } from '../dataModel/type';
import { isEmpty, reduce, mapValues, forEach } from 'lodash';
import { Where, Operator } from '../dataSource/interface';

// constants
const UNDERSCORE = '_';

export default class WhereInputPlugin implements Plugin {
  public visitModel(model: Model, context: Context) {
    const { root } = context;

    // add where input
    const modelWhereInputName = this.getWhereInputName(model);
    // add filter: https://www.opencrud.org/#sec-Data-types
    const whereInput = `input ${modelWhereInputName} {
      ${this.createWhereFilter(model.getFields())}
    }`;

    root.addInput(whereInput);

    // add where unique input
    // only use the unique field
    const modelWhereUniqueInputName = this.getWhereUniqueInputName(model);
    const whereUniqueInput = `input ${modelWhereUniqueInputName} {
      ${this.createWhereUniqueFilter(model.getName(), model.getFields())}
    }`;
    root.addInput(whereUniqueInput);
  }

  public getWhereInputName(model: Model): string {
    return `${model.getNamings().capitalSingular}WhereInput`;
  }

  public getWhereUniqueInputName(model: Model): string {
    return `${model.getNamings().capitalSingular}WhereUniqueInput`;
  }

  public parseUniqueWhere(where: Record<string, any>): Where {
    return mapValues(where, value => {
      return {[Operator.eq]: value};
    }) as Where;
  }

  public parseWhere(where: Record<string, any>): Where {
    // parse where: {name: value, price_gt: value}
    // to {name: {eq: value}, price: {gt: value}}
    return reduce(where, (result, value, key) => {
      const {fieldName, operator} = this.getNameAndOperator(key);

      if (!result[fieldName]) {
        result[fieldName] = {};
      }
      result[fieldName][operator] = value;
      return result;
    }, {} as any);
  }

  private getNameAndOperator(field: string): {fieldName: string, operator: Operator} {
    // split field name and operator from 'price_gt'
    const lastUnderscoreIndex = field.lastIndexOf(UNDERSCORE);

    // no underscore in field, it's a equal operator
    if (lastUnderscoreIndex < 0) {
      return {
        fieldName: field,
        operator: Operator.eq,
      };
    }

    // slice the operator
    const operator = field.slice(lastUnderscoreIndex + 1);

    // validate the operator
    const validOperator: Operator = Operator[operator];
    if (!validOperator) {
      throw new Error(`Operator ${operator} no support`);
    }
    const fieldName = field.slice(0, lastUnderscoreIndex);
    return {fieldName, operator: validOperator};
  }

  private createWhereFilter(fields: Record<string, Field>) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string, type: string}> = [];
    forEach(fields, (field, name) => {
      switch (field.getType()) {
        case DataModelType.STRING:
        case DataModelType.INT:
        case DataModelType.FLOAT:
        case DataModelType.ENUM:
        case DataModelType.ID:
        case DataModelType.BOOLEAN:
          inputFields.push({
            fieldName: name,
            type: field.getTypename(),
          });
          break;
      }
    });

    return inputFields.map(({fieldName, type}) => `${fieldName}: ${type}`).join(' ');
  }

  private createWhereUniqueFilter(modelName: string, fields: Record<string, Field>) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string, type: string}> = [];
    forEach(fields, (field, name) => {
      if (field.isUnique()) {
        inputFields.push({
          fieldName: name,
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
