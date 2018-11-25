import { createHookMap as createUniToOneHook } from './uniToOne';
import { createHookMap as createUniOneToManyHook } from './uniOneToMany';
import { createHookMap as createBiOneToManyHook } from './biOneToMany';
import { createHookMap as createBiOneToOneHook } from './biOneToOne';
import { createHookMap as createManyToManyHook } from './manyToMany';
import { Hook } from './interface';
import {
  RelationType,
  ModelRelation
} from '../dataModel';

export const createRelationHook = (relations: ModelRelation[]): Array<Record<string, Hook>> => {
  const hooks = relations.map(relation => {
    switch (relation.type) {
      case RelationType.uniManyToOne:
      case RelationType.uniOneToOne:
        return createUniToOneHook(relation);

      case RelationType.uniOneToMany:
        return createUniOneToManyHook(relation);

      case RelationType.biOneToOne:
        return createBiOneToOneHook(relation);

      case RelationType.biOneToMany:
        return createBiOneToManyHook(relation);

      case RelationType.biManyToMany:
        return createManyToManyHook(relation);

      default:
        throw new Error(`unknown relation type ${relation.type}`);
    }
  });

  return hooks;
};
