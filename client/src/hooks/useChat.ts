import { useState, useCallback } from 'react';
import { 
  useGetUsersQuery,
  useLazyGetConversationQuery,
  useSendMessageMutation,
  useGetUserPublicKeyQuery,
  useGetGroupsQuery,
  useLazyGetGroupMessagesQuery,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
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

  const [getConversation, { 
    isLoading: isMessagesLoading 
  }] = useLazyGetConversationQuery();

  const [getGroupMessages, { 
    isLoading: isGroupMessagesLoading 
  }] = useLazyGetGroupMessagesQuery();

  const [sendMessageMutation, { 
    isLoading: isSendingMessage 
  }] = useSendMessageMutation();

  const [sendGroupMessageMutation, { 
    isLoading: isSendingGroupMessage 
  }] = useSendGroupMessageMutation();

  const [createGroupMutation, { 
    isLoading: isCreatingGroup 
  }] = useCreateGroupMutation();

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

  // Cargar mensajes de una conversación directa
  const loadConversation = useCallback(async (userId: string) => {
    if (!currentUserId) {
      console.error('❌ No current user ID available');
      return;
    }

    try {
      console.log('📨 Loading conversation between:', currentUserId, 'and', userId);
      const result = await getConversation({
        user1: currentUserId,
        user2: userId
      }).unwrap();

      setMessages(result.messages || []);
      console.log('📨 Messages loaded:', result.message_count);
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      setMessages([]);
    }
  }, [currentUserId, getConversation]);

  // Cargar mensajes de un grupo
  const loadGroupConversation = useCallback(async (groupId: string) => {
    try {
      console.log('👥 Loading group messages for:', groupId);
      const result = await getGroupMessages(groupId).unwrap();

      setGroupMessages(result.messages || []);
      console.log('👥 Group messages loaded:', result.message_count);
    } catch (error) {
      console.error('❌ Error loading group messages:', error);
      setGroupMessages([]);
    }
  }, [getGroupMessages]);

  // Seleccionar usuario y cargar conversación
  const selectUser = useCallback(async (user: User) => {
    setSelectedUser(user);
    setSelectedGroup(null); // Deseleccionar grupo
    setGroupMessages([]); // Limpiar mensajes de grupo
    await loadConversation(user.id);
  }, [loadConversation]);

  // Seleccionar grupo y cargar conversación
  const selectGroup = useCallback(async (group: Group) => {
    setSelectedGroup(group);
    setSelectedUser(null); // Deseleccionar usuario
    setMessages([]); // Limpiar mensajes directos
    await loadGroupConversation(group.id);
  }, [loadGroupConversation]);

  // Enviar mensaje directo
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
      
      // Recargar mensajes de la conversación
      await loadConversation(selectedUser.id);
      
      // Actualizar última conversación
      updateConversationLastMessage(selectedUser.id, newMessage);
      
      setSendSuccess(true);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedUser, currentUserId, sendMessageMutation, loadConversation]);

  // Enviar mensaje a grupo
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
      
      // Recargar mensajes del grupo
      await loadGroupConversation(selectedGroup.id);
      
      // Refrescar la lista de grupos para actualizar el último mensaje
      refetchGroups();
      
      setSendSuccess(true);
      return true;
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedGroup, sendGroupMessageMutation, loadGroupConversation, refetchGroups]);

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
  }, [refetchUsers, refetchGroups]);

  // Reset estados
  const resetChatState = useCallback(() => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
    setGroupMessages([]);
    setNewMessage('');
    setSendSuccess(false);
  }, []);

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
    loadConversation,
    loadGroupConversation,
    updateConversationLastMessage,
  };
};

export default useChat;