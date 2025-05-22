import React from 'react';
import '../Home/Home.css';

interface Props {
  sender: string;
  content: string;
  timestamp: string;
}

const MessageBubble: React.FC<Props> = ({ sender, content, timestamp }) => {
  const isMe = sender === 'Tú';

  return (
    <div className={`message ${isMe ? 'right' : 'left'}`}>
      <div>{content}</div>
      <div className="timestamp">{timestamp}</div>
    </div>
  );
};

export default MessageBubble;
