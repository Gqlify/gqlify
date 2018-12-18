import { forEach, get, size } from 'lodash';
import RelationField from '../relationField';
import { ModelRelation, RelationType } from './types';
import { Field, Model } from '..';
import { RELATION_DIRECTIVE_NAME } from '../../constants';

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
  field: Field;
  fieldName: string;
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
      const relationField: RelationTableField = {
        type: field.isList() ? toRelation.many : toRelation.one,
        fieldName,
        field,
        sourceModel: model,
        targetModel: relationToModel,
      };

      // if relation has name, or having name in relationConfig
      // todo: think of an interface to access metadata from relationField
      const relationName: string = get(field.getRelationConfig(), 'name') ||
        get(field.getMetadata('relation'), 'name');

      if (relationName) {
        // set to relationField
        field.setRelationName(relationName);
        // relationName not exist yet, but still looking for targetSide at later iteration
        if (!relationsWithName[relationName]) {
          relationsWithName[relationName] = {sourceSide: relationField};
        } else if (relationsWithName[relationName]) {
          relationsWithName[relationName].targetSide = relationField;
        }
        return;
      }

      // no relationName specified
      // put it in relation table to find out its relation type later
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
        sourceField: sourceSide.fieldName,
        metadata: sourceSide.field.getMetadata(RELATION_DIRECTIVE_NAME),
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
        sourceField: sourceSide.fieldName,
        targetField: targetSide.fieldName,
        metadata: (sourceSide.field as RelationField).getRelationConfig(),
      };
    } else if (sourceSide.type === toRelation.one && targetSide.type === toRelation.many) {
      relation = {
        name,
        type: RelationType.biOneToMany,
        source: sourceSide.targetModel,
        target: sourceSide.sourceModel,
        sourceField: targetSide.fieldName,
        targetField: sourceSide.fieldName,
        metadata: (sourceSide.field as RelationField).getRelationConfig(),
      };
    } else if (sourceSide.type === toRelation.many && targetSide.type === toRelation.one) {
      relation = {
        name,
        type: RelationType.biOneToMany,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.fieldName,
        targetField: targetSide.fieldName,
        metadata: (sourceSide.field as RelationField).getRelationConfig(),
      };
    } else if (sourceSide.type === toRelation.many && targetSide.type === toRelation.many) {
      relation = {
        name,
        type: RelationType.biManyToMany,
        source: sourceSide.sourceModel,
        target: sourceSide.targetModel,
        sourceField: sourceSide.fieldName,
        targetField: targetSide.fieldName,
        metadata: (sourceSide.field as RelationField).getRelationConfig(),
      };
    } else {
      throw new Error(`unknown relation type from ${sourceSide.type} to ${targetSide.type}`);
    }

    modelRelations.push(relation);
  });

  // construct mutual relation from relation table
  forEach(relationTable, (toRelationMap, fromModelName) => {
    forEach(toRelationMap, (fields, toModelName) => {
      const otherSideFields: RelationTableField[] =
        get(relationTable, [toModelName, fromModelName]);
      fields.forEach(({type, field, fieldName, built}) => {
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
            sourceField: fieldName,
            metadata: field.getMetadata(RELATION_DIRECTIVE_NAME),
          };

          // todo: reduce duplicate code here
          const uniRelationName = createDefaultRelationName(relationConfig);
          // set to bothside fields
          (field as RelationField).setRelationName(uniRelationName);

          // append to result
          modelRelations.push({
            name: uniRelationName,
            ...relationConfig,
          });
          return;
        }

        // bi-directional
        const otherSide = otherSideFields[0];
        if (type === toRelation.one && otherSide.type === toRelation.one) {
          relationConfig = {
            type: RelationType.biOneToOne,
            source: fromModel,
            target: toModel,
            sourceField: fieldName,
            targetField: otherSide.fieldName,
            metadata: (field as RelationField).getRelationConfig(),
          };
        } else if (type === toRelation.one && otherSide.type === toRelation.many) {
          relationConfig = {
            type: RelationType.biOneToMany,
            source: toModel,
            target: fromModel,
            sourceField: otherSide.fieldName,
            targetField: fieldName,
            metadata: (field as RelationField).getRelationConfig(),
          };
        } else if (type === toRelation.many && otherSide.type === toRelation.one) {
          relationConfig = {
            type: RelationType.biOneToMany,
            source: fromModel,
            target: toModel,
            sourceField: fieldName,
            targetField: otherSide.fieldName,
            metadata: (field as RelationField).getRelationConfig(),
          };
        } else if (type === toRelation.many && otherSide.type === toRelation.many) {
          relationConfig = {
            type: RelationType.biManyToMany,
            source: fromModel,
            target: toModel,
            sourceField: fieldName,
            targetField: otherSide.fieldName,
            metadata: (field as RelationField).getRelationConfig(),
          };
        } else {
          throw new Error(`unknown relation type from ${type} to ${otherSide.type}`);
        }

        // mark field from otherside to built to prevent deplicate relation
        otherSide.built = true;
        const relationName = createDefaultRelationName(relationConfig);
        // set to bothside fields
        (field as RelationField).setRelationName(relationName);
        (otherSide.field as RelationField).setRelationName(relationName);

        // append to result
        modelRelations.push({
          name: relationName,
          ...relationConfig,
        });
      });
    });
  });

  return modelRelations;
};
