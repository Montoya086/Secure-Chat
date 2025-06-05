import { 
  Builder, 
  User, 
  ConversationResponse, 
  SendMessageRequest, 
  SendMessageResponse,
  UserPublicKeyResponse,
  GetGroupsResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  AddGroupMemberRequest,
  AddGroupMemberResponse,
  GroupConversationResponse,
  SendGroupMessageRequest,
  SendGroupMessageResponse
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
    providesTags: (result, error, { user1, user2 }) => {
      // Crear tags más específicos para mejor invalidación
      const conversationId = `${user1}-${user2}`;
      const reverseConversationId = `${user2}-${user1}`;
      return [
        { type: 'Conversation', id: conversationId },
        { type: 'Conversation', id: reverseConversationId },
        { type: 'Message', id: 'LIST' },
        { type: 'Message', id: user1 },
        { type: 'Message', id: user2 }
      ];
    },
  }),

  // Enviar mensaje
  sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
    query: ({ recipientId, message }) => ({
      url: `chat/messages/${recipientId}`,
      method: 'POST',
      body: { message },
    }),
    invalidatesTags: (result, error, { recipientId }) => {
      // Obtener el currentUserId del resultado o del contexto
      // Como no tenemos acceso directo aquí, invalidamos de forma más amplia
      return [
        { type: 'Message', id: 'LIST' },
        { type: 'Message', id: recipientId },
        { type: 'Conversation', id: recipientId },
        // Invalidar todas las conversaciones para asegurar actualización
        'Conversation'
      ];
    },
  }),

  // Obtener clave pública de un usuario
  getUserPublicKey: builder.query<UserPublicKeyResponse, string>({
    query: (userId) => `chat/users/${userId}/key`,
  }),

  // Obtener todos los grupos del usuario
  getGroups: builder.query<GetGroupsResponse, void>({
    query: () => 'chat/groups',
    providesTags: (result) => {
      const tags: any[] = ['Group'];
      if (result?.groups) {
        result.groups.forEach(group => {
          tags.push({ type: 'Group', id: group.id });
        });
      }
      return tags;
    },
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
    invalidatesTags: (result, error, { groupId }) => [
      'Group',
      { type: 'Group', id: groupId },
      { type: 'GroupMessage', id: groupId }
    ],
  }),

  // Obtener mensajes de un grupo
  getGroupMessages: builder.query<GroupConversationResponse, string>({
    query: (groupId) => `chat/groups/${groupId}/messages`,
    providesTags: (result, error, groupId) => [
      { type: 'GroupMessage', id: groupId },
      { type: 'Message', id: 'LIST' },
      { type: 'Group', id: groupId }
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
      { type: 'Group', id: groupId },
      { type: 'Message', id: 'LIST' },
      // Invalidar todos los grupos para actualizar el último mensaje
      'Group'
    ],
  }),
});