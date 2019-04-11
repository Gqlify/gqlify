import Model from '../dataModel/model';
import {Context, Plugin} from './interface';
import Field from '../dataModel/field';
import {DataModelType} from '../dataModel/type';
import {isEmpty, reduce, mapValues, forEach} from 'lodash';
import {Where, Operator} from '../dataSource/interface';
import {ObjectField} from '../dataModel';

// constants
const UNDERSCORE = '_';
const DOUBLE_UNDERSCORE = '__';
export default class WhereInputPlugin implements Plugin {
  public visitModel(model: Model, context: Context) {
    // object type model dont need whereInput
    if (model.isObjectType()) {
      //console.log('MODEL ', model);
      return;
    }

    // list model
    const {root} = context;

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
    return reduce(
      where,
      (result, value, key) => {
        const {fieldName, operator} = this.getNameAndOperator(key);

        if (!result[fieldName]) {
          result[fieldName] = {};
        }
        result[fieldName][operator] = value;
        return result;
      },
      {} as any
    );
  }

  private getNameAndOperator(
    field: string
  ): {fieldName: string; operator: Operator} {
    field = field.replace(/__/g, '.');

    // split field name and operator from 'price_gt'
    const lastUnderscoreIndex = field.lastIndexOf(UNDERSCORE);

    // no underscore in field, it's a equal operator
    if (lastUnderscoreIndex < 0) {
      return {
        fieldName: field,
        operator: Operator.regex
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

  private createNestedWhereFilter(
    field: ObjectField,
    name: string,
    inputFields: Array<{fieldName: string; type: string}>
  ) {
    forEach(field.getFields(), (subField, subName) => {
      this.createWhereFilterFromField(subField, subName, name, inputFields);
    });
  }

  private createWhereFilterFromField(
    field,
    name: string,
    parentName: string,
    inputFields: Array<{fieldName: string; type: string}>
  ) {
    if (!field || !name || !name.length) {
      throw new Error('Missing field or name in where input filter definition');
    }

    let completeName =
      parentName && parentName.length ? `${parentName}__${name}` : name;
    switch (field.getType()) {
      case DataModelType.OBJECT:
        this.createNestedWhereFilter(field, completeName, inputFields);
        // if (field.getTypename() === 'Location') {
        //   inputFields.push({
        //     fieldName: `${completeName}_near`,
        //     type: field.getTypename()
        //   });
        // } else {
        //   this.createNestedWhereFilter(field, completeName, inputFields);
        // }

        break;
      case DataModelType.STRING:
      case DataModelType.INT:
      case DataModelType.FLOAT:
      case DataModelType.ENUM:
      case DataModelType.ID:
      case DataModelType.BOOLEAN:
      case DataModelType.CUSTOM_SCALAR:
        inputFields.push({
          fieldName: completeName,
          type: field.getTypename()
        });

        // eq
        inputFields.push({
          fieldName: `${completeName}_eq`,
          type: field.getTypename()
        });
        break;
    }

    switch (field.getType()) {
      case DataModelType.INT:
      case DataModelType.FLOAT:
      case DataModelType.CUSTOM_SCALAR:
        if (field.getTypename() === 'Location') {
          inputFields.push({
            fieldName: `${completeName}_near`,
            type: field.getTypename()
          });
        } else {
          inputFields.push({
            fieldName: `${completeName}_gt`,
            type: field.getTypename()
          });
          inputFields.push({
            fieldName: `${completeName}_gte`,
            type: field.getTypename()
          });
          inputFields.push({
            fieldName: `${completeName}_lt`,
            type: field.getTypename()
          });
          inputFields.push({
            fieldName: `${completeName}_lte`,
            type: field.getTypename()
          });
        }

        break;
    }
  }

  private createWhereFilter(fields: Record<string, Field>) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string; type: string}> = [];
    forEach(fields, (field, name) => {
      this.createWhereFilterFromField(field, name, undefined, inputFields);
    });

    return inputFields
      .map(({fieldName, type}) => `${fieldName}: ${type}`)
      .join(' ');
  }

  private createWhereUniqueFilter(
    modelName: string,
    fields: Record<string, Field>
  ) {
    // create equals on scalar fields
    const inputFields: Array<{fieldName: string; type: string}> = [];
    forEach(fields, (field, name) => {
      if (field.isUnique()) {
        inputFields.push({
          fieldName: name,
          type: field.getTypename()
        });
      }
    });

    if (isEmpty(fields)) {
      throw new Error(`no unique field find in model ${modelName}`);
    }
    return inputFields
      .map(({fieldName, type}) => `${fieldName}: ${type}`)
      .join(' ');
  }
}
