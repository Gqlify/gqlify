
export enum DataModelType {
  STRING = 'String',
  BOOLEAN = 'Boolean',
  INT = 'Int',
  FLOAT = 'Float',
  ID = 'ID',

  // Enum
  ENUM = 'ENUM',

  // Object type: http://facebook.github.io/graphql/June2018/#sec-Objects
  OBJECT = 'OBJECT',

  // Relation field
  RELATION = 'RELATION',

  // Custom type
  CUSTOM_SCALAR = 'CUSTOM_SCALAR',
}

const scalarList = [
  DataModelType.STRING,
  DataModelType.BOOLEAN,
  DataModelType.INT,
  DataModelType.FLOAT,
  DataModelType.ID,
  DataModelType.ENUM,
  DataModelType.CUSTOM_SCALAR,
];

export const isScalarType = (type: DataModelType) => {
  return scalarList.indexOf(type) >= 0;
};
