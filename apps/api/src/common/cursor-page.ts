import type { SelectQueryBuilder } from 'typeorm';
import { ApiException } from '@/common/errors/api-exception';

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ListCursor = {
  createdAt: Date;
  id: string;
};

export const encodeListCursor = (createdAt: Date, id: string): string =>
  Buffer.from(`${createdAt.toISOString()}\t${id}`, 'utf8').toString('base64url');

export const decodeListCursor = (cursor: string): ListCursor => {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const separator = decoded.indexOf('\t');
  if (separator <= 0) {
    throw new ApiException('invalid_request');
  }

  const createdAt = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !UUID_PATTERN.test(id)) {
    throw new ApiException('invalid_request');
  }

  return { createdAt, id };
};

export const resolveListLimit = (limit: number | undefined): number => limit ?? DEFAULT_LIST_LIMIT;

export const applyCreatedAtIdCursor = <Entity extends object>(
  qb: SelectQueryBuilder<Entity>,
  alias: string,
  cursor: string | undefined,
): void => {
  if (cursor === undefined) {
    return;
  }

  if (cursor.length === 0) {
    throw new ApiException('invalid_request');
  }

  const parsed = decodeListCursor(cursor);
  qb.andWhere(
    `(${alias}.createdAt < :cursorCreatedAt OR (${alias}.createdAt = :cursorCreatedAt AND ${alias}.id < :cursorId))`,
    { cursorCreatedAt: parsed.createdAt, cursorId: parsed.id },
  );
};

export const paginateRows = <Row extends { createdAt: Date; id: string }>(
  rows: Row[],
  limit: number,
): { items: Row[]; nextCursor: string | null } => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);

  return {
    items,
    nextCursor: hasMore && last !== undefined ? encodeListCursor(last.createdAt, last.id) : null,
  };
};
