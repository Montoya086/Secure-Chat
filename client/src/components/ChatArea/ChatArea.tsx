import React, { useEffect, useRef } from 'react';
import { User, Message } from '../../store/api/types';

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
  currentUserId: string;
  messages: Message[];
  newMessage: string;
  isMessagesLoading: boolean;
  isSendingMessage: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => Promise<boolean>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedUser,
  currentUserId,
  messages,
  newMessage,
  isMessagesLoading,
  isSendingMessage,
  onMessageChange,
  onSendMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    if (!newMessage.trim() || !selectedUser || isSendingMessage) return;
    
    await onSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Si no hay usuario seleccionado
  if (!selectedUser) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        color: '#666',
        fontSize: '18px'
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
          Elige un contacto de la lista para comenzar a chatear
        </p>
      </div>
    );
  }

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
          backgroundColor: colors.purple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.white,
          fontWeight: 'bold',
          marginRight: '12px'
        }}>
          {getInitials(selectedUser.name || selectedUser.email)}
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            color: colors.dark
          }}>
            {selectedUser.name || selectedUser.email}
          </h3>
        </div>
      </div>

      {/* Área de mensajes */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        {isMessagesLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: colors.primary
          }}>
            Cargando mensajes...
          </div>
        ) : messages.length === 0 ? (
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
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId;
              const showDate = index === 0 || 
                formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

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
          placeholder="Escribe un mensaje..."
          disabled={isSendingMessage}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '25px',
            border: `1px solid ${colors.secondary}`,
            outline: 'none',
            fontSize: '14px',
            backgroundColor: colors.white,
            opacity: isSendingMessage ? 0.7 : 1
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!newMessage.trim() || isSendingMessage}
          style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: colors.accent,
            color: colors.white,
            cursor: newMessage.trim() && !isSendingMessage ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: newMessage.trim() && !isSendingMessage ? 1 : 0.5,
            fontSize: '18px',
            transition: 'opacity 0.2s'
          }}
        >
          {isSendingMessage ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default ChatArea;