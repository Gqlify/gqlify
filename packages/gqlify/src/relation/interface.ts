import { RelationType, Model } from '../dataModel';

export interface Relation {
  getType(): RelationType;
}

export interface Stateful<StateType = any> {
  getState(): StateType;
}

export interface WithForeignKey {
  getForeignKeyConfig(): Array<{model: Model, foreignKey: string}>;
}
