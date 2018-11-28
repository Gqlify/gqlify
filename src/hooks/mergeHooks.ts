import { Hook, CreateContext, UpdateContext, DeleteContext } from './interface';
import { IResolverObject } from 'graphql-tools';
import { reduce, forEach, mapValues } from 'lodash';
import { flow } from 'lodash/fp';
import compose from './compose';

interface ReducedHook {
  wrapCreate?: Array<(context: CreateContext, createOperation: () => Promise<any>) => Promise<any>>;

  // update
  wrapUpdate?: Array<(context: UpdateContext, updateOperation: () => Promise<any>) => Promise<any>>;

  // delete
  wrapDelete?: Array<(context: DeleteContext, destroyOperation: () => Promise<any>) => Promise<any>>;

  // query
  resolveFields?: IResolverObject;
}

const createEmptyHook = (): ReducedHook => ({
  wrapCreate: [],
  wrapUpdate: [],
  wrapDelete: [],
  resolveFields: {},
});

export default (hooks: Array<Record<string, Hook>>): Record<string, Hook> => {
  const reducedHookMap: Record<string, ReducedHook> = reduce(hooks, (result: ReducedHook, hookMap) => {
    forEach(hookMap, (hook, modelName) => {
      if (!result[modelName]) {
        result[modelName] = createEmptyHook();
      }

      // push individual crud hook
      forEach(hook, (method, methodName) => {
        if (methodName === 'resolveFields') {
          result[modelName].resolveFields = {
            ...result[modelName].resolveFields,
            ...method,
          };
        } else {
          result[modelName][methodName].push(method);
        }
      });
    });
    return result;
  }, {});

  // combine functions
  // todo: optimize the flow, maybe execute in parallel
  return mapValues(reducedHookMap, hookMap => {
    return mapValues(hookMap, (combinedHooks, key) => {
      if (key === 'resolveFields') {
        return combinedHooks;
      } else {
        return compose(combinedHooks as any[]) as any;
      }
    });
  });
};
