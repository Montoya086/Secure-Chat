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
});