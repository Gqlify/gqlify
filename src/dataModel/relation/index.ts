import Model from '../model';
import { forEach, get, size } from 'lodash';
import RelationField from '../relationField';
import { ModelRelation, RelationType } from './types';

const createDefaultRelationName = (relationConfig: Partial<ModelRelation>): string => {
  const sourceName = relationConfig.source.getNamings().capitalSingular;
  const targetName = relationConfig.target.getNamings().capitalSingular;
  return `${sourceName}And${targetName}On${relationConfig.sourceField}`;
};

enum toRelation {
  one = '1',
  many = '*',
}

export const createRelation = (models: Model[]): ModelRelation[] => {
  const findModel = (name: string) => models.find(model => model.getName() === name);
  const relationTable: Record<string, Record<string, Array<{type: toRelation, field: string}>>> = {};
  // construct relation map first
  models.forEach(model => {
    relationTable[model.getName()] = {};
    forEach(model.getFields(), (field, fieldName) => {
      if (!(field instanceof RelationField)) {
        return;
      }

      // relation table
      const targetRelation = relationTable[model.getName()][field.getRelationTo().getName()];
      if (!targetRelation) {
        relationTable[model.getName()][field.getRelationTo().getName()] = [];
      }
      relationTable[model.getName()][field.getRelationTo().getName()].push({
        type: field.isList() ? toRelation.many : toRelation.one,
        field: fieldName,
      });
    });
  });

  // construct mutual relation from relation table
  const modelRelations: ModelRelation[] = [];
  forEach(relationTable, (toRelationMap, fromModelName) => {
    forEach(toRelationMap, (fields, toModelName) => {
      const otherSideFields: Array<{type: toRelation, field: string, built?: boolean}> =
        get(relationTable, [toModelName, fromModelName]);
      fields.forEach(({type, field}) => {
        let relationConfig: ModelRelation;
        const fromModel = findModel(fromModelName);
        const toModel = findModel(toModelName);

        // if no relation from otherside, or more than one relation
        // we make it uni-directional
        // todo: support relation with name to disambiguate them
        if (!otherSideFields || size(otherSideFields) > 1) {
          relationConfig = {
            type: (type === toRelation.one) ? RelationType.uniOneToOne : RelationType.uniOneToMany,
            source: fromModel,
            target: toModel,
            sourceField: field,
          };
        }

        // bi-directional
        const otherSide = otherSideFields[0];
        if (type === toRelation.one && otherSide.type === toRelation.one) {
          relationConfig = {
            type: RelationType.biOneToOne,
            source: fromModel,
            target: toModel,
            sourceField: field,
            targetField: otherSide.field,
          };
        } else if (type === toRelation.one && otherSide.type === toRelation.many) {
          relationConfig = {
            type: RelationType.biOneToMany,
            source: toModel,
            target: fromModel,
            sourceField: otherSide.field,
            targetField: field,
          };
        } else if (type === toRelation.many && otherSide.type === toRelation.one) {
          relationConfig = {
            type: RelationType.biOneToMany,
            source: fromModel,
            target: toModel,
            sourceField: field,
            targetField: otherSide.field,
          };
        } else if (type === toRelation.many && otherSide.type === toRelation.many) {
          relationConfig = {
            type: RelationType.biManyToMany,
            source: fromModel,
            target: toModel,
            sourceField: field,
            targetField: otherSide.field,
          };
        } else {
          throw new Error(`unknown relation type from ${type} to ${otherSide.type}`);
        }

        // mark field from otherside to built to prevent deplicate relation
        otherSide.built = true;
        modelRelations.push({
          name: createDefaultRelationName(relationConfig),
          ...relationConfig,
        });
      });
    });
  });

  return modelRelations;
};
