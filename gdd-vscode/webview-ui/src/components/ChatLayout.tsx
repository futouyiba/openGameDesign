import React, { useEffect, useRef } from 'react';
import { MermaidBlock } from './MermaidBlock';

interface ChatLayoutProps {
    messages: Array<{ role: 'ai' | 'user'; content: string }>;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ messages }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const renderContent = (content: string) => {
        // Basic parser for mermaid blocks
        // Format: ```mermaid ... ```
        const parts = content.split(/(```mermaid[\s\S]*?```)/g);

        return parts.map((part, idx) => {
            if (part.startsWith('```mermaid')) {
                const code = part.replace(/^```mermaid\n/, '').replace(/```$/, '');
                return <MermaidBlock key={idx} code={code} />;
            }
            // Convert newlines to breaks for text parts
            return <span key={idx} dangerouslySetInnerHTML={{ __html: part.replace(/\n/g, '<br>') }} />;
        });
    };

    return (
        <div className="chat-container">
            {messages.map((msg, idx) => (
                <div
                    key={idx}
                    className={`message ${msg.role === 'ai' ? 'ai-message' : 'user-message'}`}
                >
                    <strong>{msg.role === 'ai' ? 'AI' : 'YOU'}</strong>
                    <div>{renderContent(msg.content)}</div>
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>
    );
};
