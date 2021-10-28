export type Actions =
  | 'GET_USER'
  | 'SIGN_IN_USER'
  | 'GET_USERS'
  
  | 'GET_USER_TAGS_BY_USER_ID'
  | 'UPDATE_USER_TAG'
  | 'DELETE_USER_TAG'

  | 'GET_POST'
  | 'GET_POSTS'
  | 'GET_POSTS_BY_TAG'
  | 'GET_POSTS_BY_USER_ID'

  | 'GET_TAGS'

  | 'GET_COURSE'
  | 'ADD_COURSE_CHAPTERS'

  | 'GET_CHAPTER'

  | 'GET_USER_COURSE'
  | 'UPDATE_USER_COURSE'
  | 'DELETE_USER_COURSE'

  | 'GET_USER_CHAPTER'
  | 'GET_USER_CHAPTER_PROGRESS'
  | 'UPDATE_USER_CHAPTER'
  | 'DELETE_USER_CHAPTER'

  |'GET_EVENTS';

export type CommonActions =
  | 'INSERT_ONE'
  | 'INSERT_MANY'
  | 'FIND_BY_ID'
  | 'DELETE_BY_ID'
  | 'UPDATE_BY_ID';
