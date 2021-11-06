import { Client, QueryConfig } from 'pg';

import { User, UserStatus } from 'interfaces/user.type';
import { QueryParams } from 'interfaces/query-params.type';
import {
  BADGE_TABLE, ENTITY_TABLE, ROLE_TABLE, USER_ROLE_TABLE, USER_TABLE
} from 'constants/tables';


export async function getUser(payload: { user_name: string }): Promise<User> {
  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  const getUserQuery: QueryConfig = {
    text: `SELECT u.entity_id, u.id, u.user_name, u.full_name, 
            u.email, u.created_at, u.updated_at, u.cover_image, u.bio, u.status,
            COALESCE(JSON_AGG(r.name) 
              FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
            FROM ${USER_TABLE} AS u
            LEFT JOIN ${USER_ROLE_TABLE} AS ur ON ur.user_id = u.id
			      LEFT JOIN ${ROLE_TABLE} AS r ON ur.role_id = r.id
            WHERE u.user_name = $1
            GROUP BY u.entity_id, u.id;`,
    values: [payload.user_name]
  };

  const data = await postgresClient.query<User>(getUserQuery);

  if (data.rows && data.rows.length) {
    return {
      id: data.rows[0]?.id as number,
      user_name: data.rows[0]?.user_name as string,
      password: '',
      full_name: data.rows[0]?.full_name as string,
      email: data.rows[0]?.email as string,
      created_at: data.rows[0]?.created_at as string,
      updated_at: data.rows[0]?.updated_at as string,
      bio: data.rows[0]?.bio as string,
      status: data.rows[0]?.status as UserStatus,
      slug: data.rows[0]?.slug as string,
      primary_badge: data.rows[0]?.primary_badge as number,
      roles: data.rows[0]?.roles as Record<string, unknown>
    };
  }
  throw new Error('User not found');
}

export async function getUsers(queryParams: QueryParams) {
  // Set default values for query params

  const DEFAULT_FIELDS = ['user_name', 'full_name', 'avatar'];
  const {
    limit_fields,
    search = '',
    page = 1,
    limit = 10,
    status = 'active',
    order = 'ASC',
    sort_field = 'created_at',
    with_table = ['entity', 'primary_badge']
  } = queryParams;

  let limitFields: string[] = limit_fields ? (typeof limit_fields === 'string' ? [limit_fields] : limit_fields) : DEFAULT_FIELDS;

  limitFields = limitFields.map((item) => `u.${item}`);

  let SELECT_CLAUSE = `SELECT u.id as user_id, ${limitFields}`,
    JOIN_CLAUSE = '',
    WHERE_CLAUSE = 'WHERE u.status = $1',
    GROUP_BY_CLAUSE = 'GROUP BY user_id';

  const queryValues: any[] = [status];

  if (search) {
    queryValues.push(`%${search}%`);
    WHERE_CLAUSE = `${WHERE_CLAUSE} 
      AND (u.meta_title LIKE $${queryValues.length} 
      OR u.meta_description LIKE $${queryValues.length})`;
  }

  if (with_table.includes('entity')) {
    const buildEntityObj = `'id', entity.id, 'name', entity.name, 'description', entity.description`;
    SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                      JSON_BUILD_OBJECT(${buildEntityObj}) AS entity`;
    JOIN_CLAUSE = `${JOIN_CLAUSE} LEFT JOIN ${ENTITY_TABLE} AS entity on u.entity_id = entity.id`;
    WHERE_CLAUSE = `${WHERE_CLAUSE} AND u.entity_id = entity.id`;
    GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, entity.id`;
  }

  if (with_table.includes('primary_badge')) {
    const buildBadgeObj = `'id', badge.id, 'name', badge.name, 'description', badge.description`;
    SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                      JSON_BUILD_OBJECT(${buildBadgeObj}) AS primary_badge`;
    JOIN_CLAUSE = `${JOIN_CLAUSE} 
                    LEFT JOIN ${BADGE_TABLE} as badge on u.primary_badge = badge.id`;
    WHERE_CLAUSE = `${WHERE_CLAUSE} AND u.primary_badge = badge.id`;
    GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, badge.id`;
  }

  queryValues.push(+limit);
  queryValues.push((page - 1) * +limit);

  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  const getUsersQuery: QueryConfig = {
    text: `${SELECT_CLAUSE},
            COALESCE(JSON_AGG(r.name) 
              FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
            FROM ${USER_TABLE} AS u
            ${JOIN_CLAUSE}
            LEFT JOIN ${USER_ROLE_TABLE} AS ur ON ur.user_id = u.id
			      LEFT JOIN ${ROLE_TABLE} AS r ON ur.role_id = r.id
            ${WHERE_CLAUSE}
            ${GROUP_BY_CLAUSE}, u.entity_id, u.id
            ORDER BY 
            u.${sort_field} ${order}
            LIMIT $${queryValues.length-1}
            OFFSET $${queryValues.length};`,
    values: queryValues
  };

  const getUsersCountQuery: QueryConfig = {
    text: `SELECT COUNT(u.id)
            FROM ${USER_TABLE} AS u
            ${JOIN_CLAUSE}
            ${WHERE_CLAUSE};`,
    values: queryValues.slice(0,-2)
  };

  const userData = await postgresClient.query(getUsersQuery);
  const countData = await postgresClient.query(getUsersCountQuery);

  return {users: userData.rows, ...countData.rows[0], limit, page};
}
