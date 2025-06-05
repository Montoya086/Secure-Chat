import React, { useEffect, useRef } from 'react';
import { User, Message, Group, GroupMessage } from '../../store/api/types';

// Paleta de colores
const colors = {
  primary: '#226946',
  secondary: '#91B4A3',
  white: '#FFFFFF',
  dark: '#0D0B0C',
  accent: '#007EA7',
  purple: '#67597A'
};

interface ChatAreaProps {
  selectedUser: User | null;
  selectedGroup: Group | null;
  currentUserId: string;
  messages: Message[];
  groupMessages: GroupMessage[];
  newMessage: string;
  isMessagesLoading: boolean;
  isGroupMessagesLoading: boolean;
  isSendingMessage: boolean;
  isSendingGroupMessage: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => Promise<boolean>;
  onSendGroupMessage: () => Promise<boolean>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedUser,
  selectedGroup,
  currentUserId,
  messages,
  groupMessages,
  newMessage,
  isMessagesLoading,
  isGroupMessagesLoading,
  isSendingMessage,
  isSendingGroupMessage,
  onMessageChange,
  onSendMessage,
  onSendGroupMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages, groupMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  const handleSendMessage = async (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    if (!newMessage.trim() || (!selectedUser && !selectedGroup)) return;
    
    if (selectedGroup) {
      await onSendGroupMessage();
    } else if (selectedUser) {
      await onSendMessage();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const isLoading = isMessagesLoading || isGroupMessagesLoading;
  const isSending = isSendingMessage || isSendingGroupMessage;
  const currentMessages = selectedGroup ? groupMessages : messages;

  // Si no hay usuario ni grupo seleccionado
  if (!selectedUser && !selectedGroup) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        color: '#666',
        fontSize: '18px',
        paddingLeft: '60px'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '20px',
          opacity: 0.3
        }}>
          💬
        </div>
        <h3 style={{
          margin: 0,
          marginBottom: '10px',
          color: colors.primary
        }}>
          Selecciona una conversación
        </h3>
        <p style={{
          margin: 0,
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          Elige un contacto o grupo de la lista para comenzar a chatear
        </p>
      </div>
    );
  }

  const chatTitle = selectedGroup ? selectedGroup.name : (selectedUser?.name || selectedUser?.email);
  const chatSubtitle = selectedGroup 
    ? `${selectedGroup.member_count} miembro${selectedGroup.member_count !== 1 ? 's' : ''}`
    : selectedUser?.email;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.white,
      height: '100%'
    }}>
      {/* Header del chat */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${colors.secondary}`,
        backgroundColor: colors.white,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: selectedGroup ? colors.accent : colors.purple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.white,
          fontWeight: 'bold',
          marginRight: '12px'
        }}>
          {getInitials(chatTitle || '')}
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            color: colors.dark,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {selectedGroup && <span>👥</span>}
            {chatTitle}
          </h3>
          {chatSubtitle && (
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#666'
            }}>
              {chatSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Área de mensajes */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: colors.primary
          }}>
            Cargando mensajes...
          </div>
        ) : currentMessages.length === 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            fontSize: '16px'
          }}>
            No hay mensajes aún. ¡Inicia la conversación!
          </div>
        ) : (
          <>
            {currentMessages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const showDate = index === 0 || 
                formatDate(message.timestamp) !== formatDate(currentMessages[index - 1].timestamp);
              
              // Para mensajes de grupo, mostrar el nombre del sender
              const isGroupMessage = 'sender_name' in message;
              const senderName = isGroupMessage ? (message as GroupMessage).sender_name : null;

              return (
                <div key={message.id}>
                  {/* Separador de fecha */}
                  {showDate && (
                    <div style={{
                      textAlign: 'center',
                      margin: '20px 0',
                      color: '#666',
                      fontSize: '12px'
                    }}>
                      {formatDate(message.timestamp)}
                    </div>
                  )}

                  {/* Mensaje */}
                  <div style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Nombre del sender (solo para grupos y mensajes que no son propios) */}
                      {selectedGroup && !isOwn && senderName && (
                        <div style={{
                          fontSize: '12px',
                          color: colors.purple,
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          marginLeft: '16px'
                        }}>
                          {senderName}
                        </div>
                      )}
                      
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '18px',
                        backgroundColor: isOwn ? colors.accent : colors.white,
                        color: isOwn ? colors.white : colors.dark,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        wordWrap: 'break-word'
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          {message.content}
                        </p>
                        <div style={{
                          fontSize: '11px',
                          marginTop: '4px',
                          opacity: 0.7,
                          textAlign: 'right'
                        }}>
                          {formatTime(message.timestamp)}
                          {message.security_info?.encrypted && (
                            <span style={{ marginLeft: '4px' }} title="Mensaje encriptado">🔒</span>
                          )}
                          {message.security_info?.is_signed && (
                            <span style={{ marginLeft: '4px' }} title="Mensaje firmado">✓</span>
                          )}
                        </div>
                        {message.error && (
                          <div style={{
                            fontSize: '11px',
                            color: '#ff4444',
                            marginTop: '2px',
                            fontStyle: 'italic'
                          }}>
                            Error: {message.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input para escribir mensajes */}
      <div style={{
        padding: '20px',
        borderTop: `1px solid ${colors.secondary}`,
        backgroundColor: colors.white,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={selectedGroup ? `Mensaje al grupo ${selectedGroup.name}...` : "Escribe un mensaje..."}
          disabled={isSending}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '25px',
            border: `1px solid ${colors.secondary}`,
            outline: 'none',
            fontSize: '14px',
            backgroundColor: colors.white,
            opacity: isSending ? 0.7 : 1
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!newMessage.trim() || isSending}
          style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: colors.accent,
            color: colors.white,
            cursor: newMessage.trim() && !isSending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: newMessage.trim() && !isSending ? 1 : 0.5,
            fontSize: '18px',
            transition: 'opacity 0.2s'
          }}
        >
          {isSending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default ChatArea;