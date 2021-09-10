import {RouteOptions} from 'fastify';
import {FastifyInstance} from 'fastify/types/instance';
import * as controller from '../../controllers/index';

import  {
  createUserSchema, getUserSchema, updateUserSchema, deleteUserSchema
}  from '../../route-schemas/users/users.schema';

import {User} from 'interfaces/user.type';


// const getUsers: RouteOptions = {
//   method: 'GET',
//   url: '/users',
//   handler: async(_, reply) => {
//     reply.code(200).send({data:'Some data'});
//   }
// };

const getUser: RouteOptions = {
  method: 'GET',
  url: '/user/:user_name',
  schema: getUserSchema,
  handler: async(request, reply) => {
    const params = request.params as {user_name: string};
    const userData =  await controller.getUserController(params.user_name);
    if (userData) {
      reply.code(200).send({message: 'User Found', data: userData});
    }
    reply.code(400).send({message: 'User not Found'});

  }
};

const createUser: RouteOptions = {
  method: 'POST',
  url: '/user',
  schema: createUserSchema,
  handler: async(request, reply) => {
    try {
      const userData = await controller.createUserController(request.body as User);
      if (userData.token) {
        reply.setCookie('token', userData.token,
          {signed: false, domain:'localhost', path:'/', secure:false, httpOnly:false, maxAge:16*60, sameSite:'none'});
        reply.code(201).send({message: 'User created', user: userData.user});
      } else {
        reply.code(500).send({message:'Something Error happend'});
      }

    } catch (error) {
      throw error;
    }

  }
};

const updateUser: RouteOptions = {
  method: 'PUT',
  url: '/user/:userId',
  schema: updateUserSchema,
  handler: async(request, reply) => {
    try {
      const params = request.params as {userId: number};
      const user = await controller.updateUserController(request.body as User, params.userId);
      if (user) {
        reply.code(200).send({message: 'User updated', data:user});
      } else {
        reply.code(500).send({message:'Something Error happend'});
      }
    } catch (error) {
      throw error;
    }
  }
};

const deleteUser: RouteOptions = {
  method: 'DELETE',
  url: '/user/:userId',
  schema: deleteUserSchema,
  handler: async(request, reply) => {
    const params = request.params as {userId: number};

    if (await controller.deleteUserController(params.userId)) {
      reply.code(200).send({message: 'User deleted'});
    } else {
      reply.code(500).send({message: 'User not deleted'});
    }
  }
};

function initUsers(server:FastifyInstance, _:any, done: () => void) {
  server.route(getUser);
  server.route(createUser);
  server.route(deleteUser);
  server.route(updateUser);
  done();
}

export default initUsers;
