import React, { useEffect, useRef } from 'react';

interface ChatLayoutProps {
    messages: Array<{ role: 'ai' | 'user'; content: string }>;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ messages }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="chat-container">
            {messages.map((msg, idx) => (
                <div
                    key={idx}
                    className={`message ${msg.role === 'ai' ? 'ai-message' : 'user-message'}`}
                >
                    <strong>{msg.role === 'ai' ? 'AI' : 'YOU'}</strong>
                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }} />
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>
    );
};
