export interface RelationConfig {
  targetContentTypeId: string;
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
}
