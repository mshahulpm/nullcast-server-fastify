import { Actions } from 'interfaces/service-actions.type';

import { signInUser, resetPasswordService, updatePassword } from './auth.service';
import { getUser, getUsers } from './users.service';
import {
  getPosts, getSinglePost, getPostsBytag, getPostsByUserId
} from './posts.service';
import * as commonService from './query-builder.service';
import { getTags } from './tags.service';
import { addCoursesWithChapters, getCourse } from './course.service';
import { getChapter } from './chapter.service';
import {
  deleteUserChapter, getUserChapter,
  getUserChapterProgress, updateUserChapter
}
  from './user-chapter.service';
import {
  deleteUserCourse, getUserCourse, updateUserCourse
} from 'services/postgres/user-course.service';
import { getEvents, getEventsByUserId } from './events.service';
import {
  deletePostTag, getPostsByTagId, getTagsByPostId
} from './post-tag.service';
import {
  deleteUserTag, getUserTagsByUserId, updateUserTag
} from './user-tag.service';
import { checkAdmin } from './admin.service';
import { getSubscribers } from './subscribers.service';

export const serviceActions: { [x in Actions]: any } = {
  GET_USER: getUser,
  SIGN_IN_USER: signInUser,
  GET_USERS: getUsers,

  CHECK_ADMIN: checkAdmin,

  GET_USER_TAGS_BY_USER_ID: getUserTagsByUserId,
  UPDATE_USER_TAG: updateUserTag,
  DELETE_USER_TAG: deleteUserTag,

  GET_POST: getSinglePost,
  GET_POSTS: getPosts,
  GET_POSTS_BY_TAG: getPostsBytag,
  GET_POSTS_BY_USER_ID: getPostsByUserId,

  GET_TAGS: getTags,

  GET_POSTS_BY_TAG_ID: getPostsByTagId,
  GET_TAGS_BY_POST_ID: getTagsByPostId,
  DELETE_POST_TAG: deletePostTag,

  GET_COURSE: getCourse,
  ADD_COURSE_CHAPTERS: addCoursesWithChapters,

  GET_CHAPTER: getChapter,

  GET_USER_COURSE: getUserCourse,
  UPDATE_USER_COURSE: updateUserCourse,
  DELETE_USER_COURSE: deleteUserCourse,

  GET_USER_CHAPTER: getUserChapter,
  GET_USER_CHAPTER_PROGRESS: getUserChapterProgress,
  UPDATE_USER_CHAPTER: updateUserChapter,
  DELETE_USER_CHAPTER: deleteUserChapter,

  RESET_PASSWORD: resetPasswordService,
  UPDATE_PASSWORD: updatePassword,

  GET_EVENTS: getEvents,
  GET_EVENTS_BY_USER_ID: getEventsByUserId,

  GET_SUBSCRIBERS: getSubscribers
};

export const commonActions = {
  INSERT_ONE: commonService.insertOne,
  FIND_BY_ID: commonService.findOneById,
  INSERT_MANY: commonService.insertMany,
  DELETE_BY_ID: commonService.deleteOneById,
  UPDATE_BY_ID: commonService.updateOneById,
  UPDATE_BY_SINGLE_FIELD: commonService.updateBySingleField,
  FIND_ONE_BY_FIELD: commonService.findOneByField
};
