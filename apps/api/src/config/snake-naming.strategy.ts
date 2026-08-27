import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const toSnakeCase = (value: string): string =>
  value
    .replaceAll(/([A-Z])/g, '_$1')
    .replaceAll(/__/g, '_')
    .replace(/^_/, '')
    .toLowerCase();

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override tableName(className: string, customName: string | undefined): string {
    return customName ?? toSnakeCase(className);
  }

  override columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    const base = customName ?? toSnakeCase(propertyName);
    if (embeddedPrefixes.length === 0) {
      return base;
    }

    return `${toSnakeCase(embeddedPrefixes.join('_'))}_${base}`;
  }

  override relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return toSnakeCase(`${firstTableName}_${firstPropertyName}_${secondTableName}`);
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return toSnakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
