import { Client, QueryConfig } from 'pg';

import {
  POST_TABLE, POST_TAG_TABLE, POST_VOTE_TABLE, TAG_TABLE, USER_TABLE
} from 'constants/tables';

import { Post } from 'interfaces/post.type';
import { QueryParams } from 'interfaces/query-params.type';
import { TokenUser } from 'interfaces/user.type';


function constructJoinQuery({
  limit_fields,
  with_table = ['users', 'tags']
}: QueryParams, userId?: number) {

  const DEFAULT_FIELDS = ['id', 'slug', 'created_by', 'html', 'status', 'mobiledoc', 'created_at', 'published_at', 'banner_image', 'title', 'meta_title'];

  let limitFields: string[] = limit_fields ? (typeof limit_fields === 'string' ? [limit_fields] : limit_fields) : DEFAULT_FIELDS;

  limitFields = limitFields.map((item) => `post.${item}`);

  let SELECT_CLAUSE = `SELECT ${limitFields}`,
    JOIN_CLAUSE = '',
    GROUP_BY_CLAUSE = '';

  if (with_table) {
    GROUP_BY_CLAUSE = `GROUP BY post.id`;

    if (with_table.includes('users')) {
      // JSON_BUILD_OBJECT is to build object based on selected colums of the row
      const buildUserObj = `'user_name', u.user_name, 'id', u.id, 'avatar', u.avatar`;

      SELECT_CLAUSE = `${SELECT_CLAUSE}, JSON_BUILD_OBJECT(${buildUserObj}) AS user`;
      JOIN_CLAUSE = `${JOIN_CLAUSE} JOIN ${USER_TABLE} AS u ON u.id = post.created_by`;
      GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, u.id`;
    }

    if (with_table.includes('tags')) {
      const buildTagsObj = `'id', tag.id, 'name', tag.name`;
      SELECT_CLAUSE = `${SELECT_CLAUSE},
                        COALESCE(JSON_AGG(JSON_BUILD_OBJECT(${buildTagsObj})) 
                        FILTER (WHERE tag.id IS NOT NULL), '[]') AS tags`;
      JOIN_CLAUSE = `${JOIN_CLAUSE}
                          LEFT JOIN ${POST_TAG_TABLE} AS post_tags on post.id = post_tags.post_id
                          LEFT JOIN ${TAG_TABLE} AS tag on tag.id = post_tags.tag_id`;
    }

    if (with_table.includes('votes')) {
      SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                          count(CASE WHEN votes.value = 1 THEN 1 END) AS upvotes,
                          count(CASE WHEN votes.value = -1 THEN 1 END) AS downvotes,
                          COALESCE(JSON_AGG(votes.user_id) FILTER (WHERE votes.user_id IS NOT NULL), '[]') AS votes`;
      JOIN_CLAUSE = `${JOIN_CLAUSE}
                          LEFT JOIN ${POST_VOTE_TABLE} AS votes ON votes.post_id = post.id`;


      if (userId) {
        // Check if the user has voted or not,
        // If voted, find if it's up or down
        SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                        CASE
                        WHEN votes.user_id = ${userId} THEN
                                CASE
                                        WHEN votes.value = 1 THEN 'up'
                                        WHEN votes.value = -1 THEN 'down'
                                END
                        ELSE null
                        END as vote_kind`;
        GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, votes.user_id, votes.value`;
      }
    }
  }

  return { SELECT_CLAUSE, JOIN_CLAUSE, GROUP_BY_CLAUSE };
}

function constructQuery(
  {
    limit_fields,
    with_table = ['users', 'tags'],
    tag = ''
  }:QueryParams, userId: number) {

  const DEFAULT_FIELDS = ['slug', 'created_by', 'status', 'mobiledoc', 'created_at', 'published_at', 'banner_image', 'title', 'meta_title'];

  let limitFields: string[] = limit_fields ? (typeof limit_fields === 'string' ? [limit_fields] : limit_fields) : DEFAULT_FIELDS;

  limitFields = limitFields.map((item) => `posts.${item}`);

  let SELECT_CLAUSE = `SELECT posts.id as post_id, posts.html as html, ${limitFields}`,
    GROUP_BY_CLAUSE = '',
    JOIN_CLAUSE = '';

  if (with_table) {
    GROUP_BY_CLAUSE = 'GROUP BY posts.id';

    if (with_table.includes('users')) {
      // JSON_BUILD_OBJECT is to build object based on selected colums of the row
      const buildUserObj = `'user_name', u.user_name, 'id', u.id, 'avatar', u.avatar`;

      SELECT_CLAUSE = `${SELECT_CLAUSE}, JSON_BUILD_OBJECT(${buildUserObj}) AS user`;
      GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, u.id`;
    }

    if (with_table.includes('tags')) {
      if (!tag) {
        const buildTagsObj = `'id', tags.id, 'name', tags.name`;
        SELECT_CLAUSE = `${SELECT_CLAUSE},
                        COALESCE(JSON_AGG(JSON_BUILD_OBJECT(${buildTagsObj})) 
                        FILTER (WHERE tags.id IS NOT NULL), '[]') AS tag`;
      }
      else {
        const buildTagsObj = `'id', t.id, 'name', t.name`;
        SELECT_CLAUSE = `${SELECT_CLAUSE},
                        COALESCE(JSON_AGG(JSON_BUILD_OBJECT(${buildTagsObj})) 
                        FILTER (WHERE t.id IS NOT NULL), '[]') AS tag`;
      }
    }

    if (with_table.includes('votes')) {
      SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                          count(CASE WHEN votes.value = 1 THEN 1 END) AS upvotes,
                          count(CASE WHEN votes.value = -1 THEN 1 END) AS downvotes,
                          COALESCE(JSON_AGG(votes.user_id) FILTER (WHERE votes.user_id IS NOT NULL), '[]') AS votes`;


      if (userId) {
        // Check if the user has voted or not,
        // If voted, find if it's up or down
        SELECT_CLAUSE = `${SELECT_CLAUSE}, 
                        CASE
                        WHEN votes.user_id = ${userId} THEN
                                CASE
                                        WHEN votes.value = 1 THEN 'up'
                                        WHEN votes.value = -1 THEN 'down'
                                END
                        ELSE null
                        END as vote_kind`;
        GROUP_BY_CLAUSE = `${GROUP_BY_CLAUSE}, votes.user_id, votes.value`;
      }
    }
  }


  JOIN_CLAUSE = `LEFT join ${POST_TAG_TABLE} AS post_tags on post_tags.tag_id = tags.id
                  LEFT join ${POST_TABLE} AS posts on posts.id = post_tags.post_id
                  LEFT JOIN ${POST_VOTE_TABLE} AS votes on votes.post_id = posts.id
                  JOIN ${USER_TABLE} AS u ON u.id = posts.created_by`;

  return { SELECT_CLAUSE, JOIN_CLAUSE, GROUP_BY_CLAUSE};
}

export async function getSinglePost(
  payload: { key: string | number; field: string },
  queryParams: QueryParams,
  user: TokenUser
) {
  const { key, field = 'id' } = payload;
  // Set default values for query params
  const { limit_fields, with_table } = queryParams;

  const WHERE_CLAUSE = `WHERE post.${field} = $1`;

  const queryValues = [key];

  const { SELECT_CLAUSE, JOIN_CLAUSE, GROUP_BY_CLAUSE } = constructJoinQuery({
    limit_fields,
    with_table
  }, user?.id);

  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  const getPostsQuery: QueryConfig = {
    text: `${SELECT_CLAUSE}
            FROM ${POST_TABLE} AS post
            ${JOIN_CLAUSE}
            ${WHERE_CLAUSE}
            ${GROUP_BY_CLAUSE};`,
    values: queryValues
  };

  const data = await postgresClient.query<Post>(getPostsQuery);

  return data.rows[0];
}

export async function getPosts(queryParams: QueryParams, user: TokenUser) {
  // Set default values for query params
  const {
    limit_fields,
    search = '',
    page = 1,
    limit = 10,
    status = '',
    order = 'ASC',
    sort_field = 'published_at',
    with_table = []
  } = queryParams;

  let WHERE_CLAUSE = '';
  const queryValues: any[] = [+limit, (page - 1) * +limit];

  if (status) {
    queryValues.push(status);
    WHERE_CLAUSE = `WHERE post.status = $${queryValues.length}`;
  }

  if (search) {
    queryValues.push(`%${search}%`);
    if (status) {
      WHERE_CLAUSE = `${WHERE_CLAUSE} 
      AND (post.meta_title LIKE $${queryValues.length} 
      OR post.meta_description LIKE $${queryValues.length} 
      OR post.custom_excerpt LIKE $${queryValues.length})`;
    } else {
      WHERE_CLAUSE = `WHERE
      (post.meta_title LIKE $${queryValues.length} 
      OR post.meta_description LIKE $${queryValues.length} 
      OR post.custom_excerpt LIKE $${queryValues.length})`;
    }
  }
  const { SELECT_CLAUSE, JOIN_CLAUSE, GROUP_BY_CLAUSE } = constructJoinQuery({
    limit_fields,
    with_table
  }, user?.id);

  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  const getPostsQuery: QueryConfig = {
    text: `${SELECT_CLAUSE}
            FROM ${POST_TABLE} AS post
            ${JOIN_CLAUSE}
            ${WHERE_CLAUSE}
            ${GROUP_BY_CLAUSE}
            ORDER BY 
              post.${sort_field} ${order}
            LIMIT $1
            OFFSET $2;`,
    values: queryValues
  };

  const getPostsCountQuery: QueryConfig = {
    text: `SELECT COUNT(id)
            FROM ${POST_TABLE} AS post
            ${WHERE_CLAUSE}
            LIMIT $1
            OFFSET $2;`,
    values: queryValues
  };

  const postData = await postgresClient.query<Post>(getPostsQuery);
  const countData = await postgresClient.query<Post>(getPostsCountQuery);

  return {posts: postData.rows, ...countData?.rows[0], limit, page};
}

export async function getPostsBytag(
  payload: { key: string; field: string },
  queryParams: QueryParams,
  user: TokenUser
) {

  const {
    limit_fields,
    search = '',
    page = 1,
    limit = 10,
    status = '',
    order = 'ASC',
    sort_field = 'published_at',
    with_table
  } = queryParams;

  const tag = payload.key;

  const { SELECT_CLAUSE, JOIN_CLAUSE, GROUP_BY_CLAUSE } = constructQuery(
    {
      limit_fields,
      with_table,
      tag
    }, user?.id
  );

  let WHERE_CLAUSE = 'WHERE tags.name = $1';

  const queryValues = [tag, +limit, (page - 1) * +limit];

  if (status) {
    queryValues.push(status);
    WHERE_CLAUSE = `${WHERE_CLAUSE} AND posts.status = $${queryValues.length}`;
  }

  if (search) {
    queryValues.push(`%${search}%`);
    WHERE_CLAUSE = `${WHERE_CLAUSE} 
      AND (posts.meta_title LIKE $${queryValues.length} 
      OR posts.meta_description LIKE $${queryValues.length} 
      OR posts.custom_excerpt LIKE $${queryValues.length})`;
  }

  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  const getPostsQuery: QueryConfig = {
    text: ` ${SELECT_CLAUSE}
            from ${TAG_TABLE} AS tags
            ${JOIN_CLAUSE}
            LEFT join ${POST_TAG_TABLE} AS pt on pt.post_id = posts.id
            LEFT JOIN ${TAG_TABLE} AS t on t.id = pt.tag_id
            ${WHERE_CLAUSE}
            ${GROUP_BY_CLAUSE}
            ORDER BY 
            posts.${sort_field} ${order}
            LIMIT $2
            OFFSET $3;`,
    values: queryValues
  };

  const getPostsCountQuery: QueryConfig = {
    text: ` SELECT COUNT(posts.id)
            from ${POST_TABLE}
            LEFT JOIN ${POST_TAG_TABLE} AS post_tags on posts.id = post_tags.post_id
            LEFT JOIN ${TAG_TABLE} AS tags on tags.id = post_tags.tag_id
            ${WHERE_CLAUSE}
            LIMIT $2
            OFFSET $3;`,
    values: queryValues
  };

  const postData = await postgresClient.query<Post>(getPostsQuery);
  const countData = await postgresClient.query<Post>(getPostsCountQuery);

  return { posts: postData.rows, ...countData.rows[0], limit, page };
}

export async function getPostsByUserId(
  payload: { key: string; field: string },
  queryParams: QueryParams,
  currentUser: TokenUser
) {

  const {
    limit_fields,
    search = '',
    page = 1,
    limit = 10,
    tag,
    status = '',
    order = 'ASC',
    sort_field = 'published_at',
    with_table
  } = queryParams;

  const userId = payload.key;

  const { SELECT_CLAUSE, GROUP_BY_CLAUSE } = constructQuery(
    {
      limit_fields,
      with_table,
      tag
    }, currentUser?.id
  );

  let { JOIN_CLAUSE } = constructQuery(
    {
      limit_fields,
      with_table,
      tag
    }, currentUser?.id
  );

  let WHERE_CLAUSE = 'WHERE u.id = $1';

  const queryValues = [userId, +limit, (page - 1) * +limit];

  if (status) {
    queryValues.push(status);
    WHERE_CLAUSE = `${WHERE_CLAUSE} AND posts.status = $${queryValues.length}`;
  }


  if (tag) {
    queryValues.push(tag);
    WHERE_CLAUSE = `${WHERE_CLAUSE} AND tags.name = $${queryValues.length}`;
    JOIN_CLAUSE = `${JOIN_CLAUSE} 
                  LEFT join ${POST_TAG_TABLE} AS pt on pt.post_id = posts.id
                  LEFT JOIN ${TAG_TABLE} as t on t.id = pt.tag_id`;
  }

  if (search) {
    queryValues.push(`%${search}%`);
    WHERE_CLAUSE = `${WHERE_CLAUSE} 
      AND (posts.meta_title LIKE $${queryValues.length} 
      OR posts.meta_description LIKE $${queryValues.length} 
      OR posts.custom_excerpt LIKE $${queryValues.length})`;
  }

  const postgresClient: Client = (globalThis as any).postgresClient as Client;

  //Only posts having atleast one tag is fetched
  const getPostsQuery: QueryConfig = {
    text: ` ${SELECT_CLAUSE}
            from ${TAG_TABLE} AS tags
            ${JOIN_CLAUSE} 
            ${WHERE_CLAUSE}
            ${GROUP_BY_CLAUSE}
            ORDER BY 
            posts.${sort_field} ${order}
            LIMIT $2
            OFFSET $3;`,
    values: queryValues
  };

  const getPostsCountQuery: QueryConfig = {
    text: ` SELECT COUNT(posts.id)
            from ${POST_TABLE} AS posts
            LEFT JOIN ${USER_TABLE} AS u on u.id = posts.created_by
            LEFT JOIN ${POST_TAG_TABLE} AS post_tags on posts.id = post_tags.post_id 
            LEFT JOIN ${TAG_TABLE} AS tags on tags.id = post_tags.tag_id
            ${WHERE_CLAUSE} AND tags.id IS NOT NULL
            LIMIT $2
            OFFSET $3;`,
    values: queryValues
  };

  const postData = await postgresClient.query<Post>(getPostsQuery);
  const countData = await postgresClient.query<Post>(getPostsCountQuery);

  return { posts: postData.rows, ...countData.rows[0], limit, page};
}

