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

// 🔥 NUEVO: Interface para mensajes optimistas con metadata
interface OptimisticMessage extends Message {
  isOptimistic: true;
  optimisticId: string;
  sentAt: number;
}

interface OptimisticGroupMessage extends GroupMessage {
  isOptimistic: true;
  optimisticId: string;
  sentAt: number;
}

const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  // 🔥 MEJORADO: Estados para mensajes optimistas con mejor tracking
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [optimisticGroupMessages, setOptimisticGroupMessages] = useState<OptimisticGroupMessage[]>([]);

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

  // Para conversaciones directas
  const { 
    data: conversationData,
    isLoading: isMessagesLoading,
    refetch: refetchConversation
  } = useGetConversationQuery(
    selectedUser && currentUserId 
      ? { user1: currentUserId, user2: selectedUser.id }
      : { user1: '', user2: '' },
    { 
      skip: !selectedUser || !currentUserId
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
      skip: !selectedGroup
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

  // 🔥 MEJORADO: Combinar mensajes reales con optimistas, filtrando duplicados
  const messages = [...(conversationData?.messages || []), ...optimisticMessages]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const groupMessages = [...(groupConversationData?.messages || []), ...optimisticGroupMessages]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 🔥 MEJORADO: Limpiar mensajes optimistas cuando llegan los reales - con mejor lógica
  useEffect(() => {
    if (conversationData?.messages && optimisticMessages.length > 0) {
      console.log('🔍 Checking optimistic messages for cleanup...');
      console.log('Real messages count:', conversationData.messages.length);
      console.log('Optimistic messages count:', optimisticMessages.length);
      
      // Buscar mensajes optimistas que ya existen en los datos reales
      const messagesToKeep: OptimisticMessage[] = [];
      const now = Date.now();
      
      optimisticMessages.forEach(optimistic => {
        // Buscar si existe un mensaje real con el mismo contenido del mismo sender en los últimos 30 segundos
        const exists = conversationData.messages.some(real => 
          real.content.trim() === optimistic.content.trim() &&
          real.sender_id === optimistic.sender_id &&
          Math.abs(new Date(real.timestamp).getTime() - optimistic.sentAt) < 30000 // 30 segundos
        );
        
        // También remover mensajes optimistas muy viejos (más de 60 segundos)
        const tooOld = (now - optimistic.sentAt) > 60000;
        
        if (!exists && !tooOld) {
          messagesToKeep.push(optimistic);
        } else {
          console.log('🧹 Removing optimistic message:', optimistic.content.substring(0, 20));
        }
      });
      
      if (messagesToKeep.length !== optimisticMessages.length) {
        setOptimisticMessages(messagesToKeep);
      }
    }
  }, [conversationData, optimisticMessages]);

  useEffect(() => {
    if (groupConversationData?.messages && optimisticGroupMessages.length > 0) {
      console.log('🔍 Checking optimistic group messages for cleanup...');
      console.log('Real group messages count:', groupConversationData.messages.length);
      console.log('Optimistic group messages count:', optimisticGroupMessages.length);
      
      const messagesToKeep: OptimisticGroupMessage[] = [];
      const now = Date.now();
      
      optimisticGroupMessages.forEach(optimistic => {
        // Buscar si existe un mensaje real con el mismo contenido del mismo sender
        const exists = groupConversationData.messages.some(real => 
          real.content.trim() === optimistic.content.trim() &&
          real.sender_id === optimistic.sender_id &&
          Math.abs(new Date(real.timestamp).getTime() - optimistic.sentAt) < 30000
        );
        
        const tooOld = (now - optimistic.sentAt) > 60000;
        
        if (!exists && !tooOld) {
          messagesToKeep.push(optimistic);
        } else {
          console.log('🧹 Removing optimistic group message:', optimistic.content.substring(0, 20));
        }
      });
      
      if (messagesToKeep.length !== optimisticGroupMessages.length) {
        setOptimisticGroupMessages(messagesToKeep);
      }
    }
  }, [groupConversationData, optimisticGroupMessages]);

  // 🔥 MEJORADO: Limpiar mensajes optimistas al cambiar de conversación
  useEffect(() => {
    console.log('🔄 Conversation changed - clearing optimistic messages');
    setOptimisticMessages([]);
    setOptimisticGroupMessages([]);
  }, [selectedUser, selectedGroup]);

  // Función para generar ID temporal único
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  // Seleccionar usuario
  const selectUser = useCallback((user: User) => {
    console.log('📨 Selecting user:', user.name || user.email);
    setSelectedUser(user);
    setSelectedGroup(null);
  }, []);

  // Seleccionar grupo
  const selectGroup = useCallback((group: Group) => {
    console.log('👥 Selecting group:', group.name);
    setSelectedGroup(group);
    setSelectedUser(null);
  }, []);

  // 🔥 MEJORADO: Enviar mensaje directo con mejor tracking optimista
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) {
      return false;
    }

    setSendSuccess(false);
    
    const optimisticId = generateTempId();
    const sentAt = Date.now();
    
    // 🔥 ACTUALIZACIÓN OPTIMISTA mejorada
    const optimisticMessage: OptimisticMessage = {
      id: optimisticId,
      sender_id: currentUserId,
      recipient_id: selectedUser.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      security_info: {
        is_signed: true,
        signature_valid: true,
        encrypted: true,
        system: 'optimistic'
      },
      isOptimistic: true,
      optimisticId,
      sentAt
    };

    console.log('🚀 Adding optimistic message:', optimisticMessage.content);
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    
    // Limpiar input inmediatamente para mejor UX
    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    try {
      console.log('📤 Sending message to:', selectedUser.id);
      const result = await sendMessageMutation({
        recipientId: selectedUser.id,
        message: messageToSend
      }).unwrap();

      console.log('✅ Message sent:', result.status);
      
      // Actualizar última conversación
      updateConversationLastMessage(selectedUser.id, messageToSend);
      
      setSendSuccess(true);
      
      // 🔥 NUEVO: Forzar limpieza del mensaje optimista después de éxito
      setTimeout(() => {
        setOptimisticMessages(prev => 
          prev.filter(msg => msg.optimisticId !== optimisticId)
        );
        console.log('🧹 Force-removed optimistic message after success');
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // 🔥 REVERTIR: Quitar mensaje optimista si falla
      setOptimisticMessages(prev => 
        prev.filter(msg => msg.optimisticId !== optimisticId)
      );
      
      // Restaurar el mensaje en el input si falla
      setNewMessage(messageToSend);
      
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedUser, currentUserId, sendMessageMutation]);

  // 🔥 MEJORADO: Enviar mensaje a grupo con mejor tracking optimista
  const sendGroupMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedGroup) {
      return false;
    }

    setSendSuccess(false);
    
    const optimisticId = generateTempId();
    const sentAt = Date.now();
    
    // 🔥 ACTUALIZACIÓN OPTIMISTA mejorada
    const senderName = currentUserData ? 
      `${currentUserData.name}` || currentUserData.email : 
      'Usuario';

    const optimisticMessage: OptimisticGroupMessage = {
      id: optimisticId,
      sender_id: currentUserId,
      sender_name: senderName,
      group_id: selectedGroup.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      security_info: {
        is_signed: true,
        signature_valid: true,
        encrypted: true,
        system: 'optimistic'
      },
      isOptimistic: true,
      optimisticId,
      sentAt
    };

    console.log('🚀 Adding optimistic group message:', optimisticMessage.content);
    setOptimisticGroupMessages(prev => [...prev, optimisticMessage]);
    
    // Limpiar input inmediatamente
    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    try {
      console.log('👥 Sending group message to:', selectedGroup.id);
      const result = await sendGroupMessageMutation({
        groupId: selectedGroup.id,
        data: { message: messageToSend }
      }).unwrap();

      console.log('✅ Group message sent:', result.status);
      
      // Refrescar la lista de grupos para actualizar el último mensaje
      refetchGroups();
      
      setSendSuccess(true);
      
      // 🔥 NUEVO: Forzar limpieza del mensaje optimista después de éxito
      setTimeout(() => {
        setOptimisticGroupMessages(prev => 
          prev.filter(msg => msg.optimisticId !== optimisticId)
        );
        console.log('🧹 Force-removed optimistic group message after success');
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      
      // 🔥 REVERTIR: Quitar mensaje optimista si falla
      setOptimisticGroupMessages(prev => 
        prev.filter(msg => msg.optimisticId !== optimisticId)
      );
      
      // Restaurar el mensaje en el input si falla
      setNewMessage(messageToSend);
      
      setSendSuccess(false);
      return false;
    }
  }, [newMessage, selectedGroup, currentUserId, currentUserData, sendGroupMessageMutation, refetchGroups]);

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
    setOptimisticMessages([]);
    setOptimisticGroupMessages([]);
    setNewMessage('');
    setSendSuccess(false);
  }, []);

  // Debug para ver cuándo se actualizan los mensajes
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