import { useState, useCallback, useEffect } from 'react';
import { 
  useGetUsersQuery,
  useGetConversationQuery,
  useSendMessageMutation,
  useGetUserPublicKeyQuery,
  useGetGroupsQuery,
  useGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useCreateGroupMutation,
} from "../store/api/baseApi-slice";
import { User, Message, Group, GroupMessage } from "../store/api/types";
import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME } from '../utils/constants';

interface Conversation {
  user: User;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
}

const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  // RTK Query hooks
  const { 
    data: users = [], 
    isLoading: isUsersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = useGetUsersQuery();

  const { 
    data: groupsResponse,
    isLoading: isGroupsLoading, 
    error: groupsError,
    refetch: refetchGroups 
  } = useGetGroupsQuery();

  const groups = groupsResponse?.groups || [];

  // 🔥 CAMBIO PRINCIPAL: Usar queries normales en lugar de lazy queries
  // Para conversaciones directas
  const { 
    data: conversationData,
    isLoading: isMessagesLoading,
    refetch: refetchConversation
  } = useGetConversationQuery(
    selectedUser && currentUserId 
      ? { user1: currentUserId, user2: selectedUser.id }
      : { user1: '', user2: '' }, // Placeholder cuando no hay selección
    { 
      skip: !selectedUser || !currentUserId // Skip la query si no hay usuario seleccionado
    }
  );

  // Para grupos
  const { 
    data: groupConversationData,
    isLoading: isGroupMessagesLoading,
    refetch: refetchGroupConversation
  } = useGetGroupMessagesQuery(
    selectedGroup?.id || '',
    { 
      skip: !selectedGroup // Skip la query si no hay grupo seleccionado
    }
  );

  // Mutations
  const [sendMessageMutation, { 
    isLoading: isSendingMessage 
  }] = useSendMessageMutation();

  const [sendGroupMessageMutation, { 
    isLoading: isSendingGroupMessage 
  }] = useSendGroupMessageMutation();

  const [createGroupMutation, { 
    isLoading: isCreatingGroup 
  }] = useCreateGroupMutation();

  // 🔥 NUEVO: Actualizar mensajes automáticamente cuando cambian los datos
  const messages = conversationData?.messages || [];
  const groupMessages = groupConversationData?.messages || [];

  // Inicializar usuario actual desde el token y hacer match con la lista de usuarios
  const initializeCurrentUser = useCallback(() => {
    const token = Cookies.get(TOKEN_COOKIE_NAME);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.user_id || payload.id;
        setCurrentUserId(userId);
        
        // Buscar el usuario actual en la lista de usuarios
        if (users.length > 0) {
          const currentUser = users.find(user => user.id === userId);
          if (currentUser) {
            setCurrentUserData(currentUser);
            console.log('👤 Current user found:', currentUser);
          } else {
            console.warn('⚠️ Current user not found in users list');
          }
        }
        
        console.log('👤 Current user ID from token:', userId);
        return userId;
      } catch (error) {
        console.error('❌ Error decoding token:', error);
      }
    }
    return null;
  }, [users]);

  // Obtener información del usuario actual formateada
  const getCurrentUserInfo = useCallback(() => {
    if (currentUserData) {
      return {
        id: currentUserData.id,
        email: currentUserData.email,
        name: currentUserData.name || ''
      };
    }
    return null;
  }, [currentUserData]);

  // Inicializar conversaciones a partir de usuarios (excluyendo al usuario actual)
  const initializeConversations = useCallback((usersList: User[]) => {
    if (!currentUserId) return;
    
    // Filtrar usuarios para no incluir al usuario actual
    const otherUsers = usersList.filter(user => user.id !== currentUserId);
    
    const convs = otherUsers.map((user: User) => ({
      user,
      lastMessage: 'Inicia una conversación...',
      timestamp: new Date().toISOString(),
      unreadCount: 0
    }));
    setConversations(convs);
    console.log('💬 Conversations initialized:', convs.length);
  }, [currentUserId]);

  // 🔥 SIMPLIFICADO: Seleccionar usuario (no necesita cargar mensajes manualmente)
  const selectUser = useCallback((user: User) => {
    console.log('📨 Selecting user:', user.name || user.email);
    setSelectedUser(user);
    setSelectedGroup(null); // Deseleccionar grupo
  }, []);

  // 🔥 SIMPLIFICADO: Seleccionar grupo (no necesita cargar mensajes manualmente)
  const selectGroup = useCallback((group: Group) => {
    console.log('👥 Selecting group:', group.name);
    setSelectedGroup(group);
    setSelectedUser(null); // Deseleccionar usuario
  }, []);

  // 🔥 SIMPLIFICADO: Enviar mensaje directo
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) {
      return false;
    }

    setSendSuccess(false);
    
    try {
      console.log('📤 Sending message to:', selectedUser.id);
      const result = await sendMessageMutation({
        recipientId: selectedUser.id,
        message: newMessage
      }).unwrap();

      console.log('✅ Message sent:', result.status);
      
      // Limpiar input
      setNewMessage('');
      
      // 🔥 ELIMINADO: No necesitamos recargar manualmente, RTK Query lo hace automáticamente
      // await loadConversation(selectedUser.id);
      
      // Actualizar última conversación
      updateConversationLastMessage(selectedUser.id, newMessage);
      
      setSendSuccess(true);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedUser, currentUserId, sendMessageMutation]);

  // 🔥 SIMPLIFICADO: Enviar mensaje a grupo
  const sendGroupMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedGroup) {
      return false;
    }

    setSendSuccess(false);
    
    try {
      console.log('👥 Sending group message to:', selectedGroup.id);
      const result = await sendGroupMessageMutation({
        groupId: selectedGroup.id,
        data: { message: newMessage }
      }).unwrap();

      console.log('✅ Group message sent:', result.status);
      
      // Limpiar input
      setNewMessage('');
      
      // 🔥 ELIMINADO: No necesitamos recargar manualmente, RTK Query lo hace automáticamente
      // await loadGroupConversation(selectedGroup.id);
      
      // Refrescar la lista de grupos para actualizar el último mensaje
      refetchGroups();
      
      setSendSuccess(true);
      return true;
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedGroup, sendGroupMessageMutation, refetchGroups]);

  // Crear grupo
  const createGroup = useCallback(async (groupName: string, memberIds: string[]) => {
    try {
      console.log('👥 Creating group:', groupName, 'with members:', memberIds);
      const result = await createGroupMutation({
        name: groupName,
        member_ids: memberIds
      }).unwrap();

      console.log('✅ Group created:', result.status);
      
      // Refrescar la lista de grupos
      await refetchGroups();
      
      return result;
    } catch (error) {
      console.error('❌ Error creating group:', error);
      throw error;
    }
  }, [createGroupMutation, refetchGroups]);

  // Actualizar último mensaje en conversación
  const updateConversationLastMessage = useCallback((userId: string, message: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.user.id === userId 
          ? { ...conv, lastMessage: message, timestamp: new Date().toISOString() }
          : conv
      )
    );
  }, []);

  // Refrescar datos
  const refreshData = useCallback(async () => {
    await Promise.all([refetchUsers(), refetchGroups()]);
    // También refrescar la conversación actual si hay una seleccionada
    if (selectedUser) {
      refetchConversation();
    }
    if (selectedGroup) {
      refetchGroupConversation();
    }
  }, [refetchUsers, refetchGroups, refetchConversation, refetchGroupConversation, selectedUser, selectedGroup]);

  // Reset estados
  const resetChatState = useCallback(() => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setNewMessage('');
    setSendSuccess(false);
  }, []);

  // 🔥 NUEVO: Debug para ver cuándo se actualizan los mensajes
  useEffect(() => {
    if (conversationData) {
      console.log('🔄 Conversation data updated:', conversationData.message_count, 'messages');
    }
  }, [conversationData]);

  useEffect(() => {
    if (groupConversationData) {
      console.log('🔄 Group conversation data updated:', groupConversationData.message_count, 'messages');
    }
  }, [groupConversationData]);

  return {
    // Estados
    users,
    groups,
    conversations,
    selectedUser,
    selectedGroup,
    currentUserId,
    currentUserData,
    messages,
    groupMessages,
    newMessage,
    sendSuccess,

    // Estados de carga
    isUsersLoading,
    isGroupsLoading,
    isMessagesLoading,
    isGroupMessagesLoading,
    isSendingMessage,
    isSendingGroupMessage,
    isCreatingGroup,

    // Errores
    usersError,
    groupsError,

    // Métodos
    initializeCurrentUser,
    getCurrentUserInfo,
    initializeConversations,
    selectUser,
    selectGroup,
    sendMessage,
    sendGroupMessage,
    createGroup,
    setNewMessage,
    refreshData,
    resetChatState,
    updateConversationLastMessage,
  };
};

export default useChat;