
export enum GraphqlType {
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
  GraphqlType.STRING,
  GraphqlType.BOOLEAN,
  GraphqlType.INT,
  GraphqlType.FLOAT,
  GraphqlType.ID,
  GraphqlType.ENUM,
  GraphqlType.CUSTOM_SCALAR,
];

export const isScalarType = (type: GraphqlType) => {
  return scalarList.indexOf(type) >= 0;
};
