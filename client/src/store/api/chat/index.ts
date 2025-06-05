import { 
  Builder, 
  User, 
  ConversationResponse, 
  SendMessageRequest, 
  SendMessageResponse,
  UserPublicKeyResponse 
} from '../types';

export const chatEndpoints = (builder: Builder) => ({
  // Obtener todos los usuarios
  getUsers: builder.query<User[], void>({
    query: () => 'auth/users',
    providesTags: ['User'],
  }),

  // Obtener conversación entre dos usuarios
  getConversation: builder.query<ConversationResponse, { user1: string; user2: string }>({
    query: ({ user1, user2 }) => `chat/messages/${user1}/${user2}`,
    providesTags: (result, error, { user1, user2 }) => [
      { type: 'Conversation', id: `${user1}-${user2}` },
      { type: 'Message', id: 'LIST' }
    ],
  }),

  // Enviar mensaje
  sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
    query: ({ recipientId, message }) => ({
      url: `chat/messages/${recipientId}`,
      method: 'POST',
      body: { message },
    }),
    invalidatesTags: (result, error, { recipientId }) => [
      { type: 'Message', id: 'LIST' },
      { type: 'Conversation', id: recipientId }
    ],
  }),

  // Obtener clave pública de un usuario
  getUserPublicKey: builder.query<UserPublicKeyResponse, string>({
    query: (userId) => `chat/users/${userId}/key`,
  }),

   // Obtener todos los grupos del usuario
  getGroups: builder.query<GetGroupsResponse, void>({
    query: () => 'chat/groups',
    providesTags: ['Group'],
  }),

  // Crear un nuevo grupo
  createGroup: builder.mutation<CreateGroupResponse, CreateGroupRequest>({
    query: (data) => ({
      url: 'chat/groups',
      method: 'POST',
      body: data,
    }),
    invalidatesTags: ['Group'],
  }),

  // Agregar miembro a grupo
  addGroupMember: builder.mutation<AddGroupMemberResponse, { groupId: string; data: AddGroupMemberRequest }>({
    query: ({ groupId, data }) => ({
      url: `chat/groups/${groupId}/members`,
      method: 'POST',
      body: data,
    }),
    invalidatesTags: ['Group'],
  }),

  // Obtener mensajes de un grupo
  getGroupMessages: builder.query<GroupConversationResponse, string>({
    query: (groupId) => `chat/groups/${groupId}/messages`,
    providesTags: (result, error, groupId) => [
      { type: 'GroupMessage', id: groupId },
      { type: 'Message', id: 'LIST' }
    ],
  }),

  // Enviar mensaje a grupo
  sendGroupMessage: builder.mutation<SendGroupMessageResponse, { groupId: string; data: SendGroupMessageRequest }>({
    query: ({ groupId, data }) => ({
      url: `chat/groups/${groupId}/messages`,
      method: 'POST',
      body: data,
    }),
    invalidatesTags: (result, error, { groupId }) => [
      { type: 'GroupMessage', id: groupId },
      { type: 'Message', id: 'LIST' },
      'Group'
    ],
  }),
});