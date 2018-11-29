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

interface RelationTableField {
  type: toRelation;
  field: string;
  built?: boolean;
  sourceModel: Model;
  targetModel: Model;
}

export const createRelation = (models: Model[]): ModelRelation[] => {
  const findModel = (name: string) => models.find(model => model.getName() === name);
  // final return of this function
  const modelRelations: ModelRelation[] = [];
  // relations without name would be collected to table
  const relationTable: Record<string, Record<string, RelationTableField[]>> = {};

  // construct relation map first
  // if relation name is given, pick them out
  const relationsWithName: Record<string, {sourceSide: RelationTableField, targetSide?: RelationTableField}> = {};
  models.forEach(model => {
    relationTable[model.getName()] = {};
    forEach(model.getFields(), (field, fieldName) => {
      if (!(field instanceof RelationField)) {
        return;
      }

      const relationToModel = field.getRelationTo();
      const relationToModelName = relationToModel.getName();
      const relationField = {
        type: field.isList() ? toRelation.many : toRelation.one,
        field: fieldName,
        sourceModel: model,
        targetModel: relationToModel,
      };

      // if relation has name
      const relationName = get(field.getMetadata('relation'), 'name');
      if (relationName && !relationsWithName[relationName]) {
        relationsWithName[relationName] = {sourceSide: relationField};
        return;
      } else if (relationName && relationsWithName[relationName]) {
        relationsWithName[relationName].targetSide = relationField;
        return;
      }

      // relation table
      const targetRelation = relationTable[model.getName()][relationToModelName];
      if (!targetRelation) {
        relationTable[model.getName()][relationToModelName] = [];
      }
      relationTable[model.getName()][relationToModelName].push(relationField);
    });
  });

  // append relations with name to modelRelations
  forEach(relationsWithName, ({sourceSide, targetSide}, name) => {
    let relation: ModelRelation;
    // uni-directional
    if (!targetSide) {
      relation = {
        name,
        type: (sourceSide.type === toRelation.one) ? RelationType.uniOneToOne : RelationType.uniOneToMany,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.field,
      };
      modelRelations.push(relation);
      return;
    }

    // bi-directional
    // todo: reduce the duplicated code here
    if (sourceSide.type === toRelation.one && targetSide.type === toRelation.one) {
      relation = {
        name,
        type: RelationType.biOneToOne,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.field,
        targetField: targetSide.field,
      };
    } else if (sourceSide.type === toRelation.one && targetSide.type === toRelation.many) {
      relation = {
        type: RelationType.biOneToMany,
        source: sourceSide.targetModel,
        target: sourceSide.sourceModel,
        sourceField: targetSide.field,
        targetField: sourceSide.field,
      };
    } else if (sourceSide.type === toRelation.many && targetSide.type === toRelation.one) {
      relation = {
        type: RelationType.biOneToMany,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.field,
        targetField: targetSide.field,
      };
    } else if (sourceSide.type === toRelation.many && targetSide.type === toRelation.many) {
      relation = {
        type: RelationType.biManyToMany,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.field,
        targetField: targetSide.field,
      };
    } else {
      throw new Error(`unknown relation type from ${sourceSide.type} to ${targetSide.type}`);
    }

    modelRelations.push(relation);
  });

  // construct mutual relation from relation table
  forEach(relationTable, (toRelationMap, fromModelName) => {
    forEach(toRelationMap, (fields, toModelName) => {
      const otherSideFields: Array<{type: toRelation, field: string, built?: boolean}> =
        get(relationTable, [toModelName, fromModelName]);
      fields.forEach(({type, field, built}) => {
        // build relation already skip it
        if (built) {
          return;
        }

        let relationConfig: ModelRelation;
        const fromModel = findModel(fromModelName);
        const toModel = findModel(toModelName);

        // if no relation from otherside, or more than one relation
        // we make it uni-directional
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
