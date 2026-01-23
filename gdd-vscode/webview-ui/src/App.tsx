import { useEffect, useState } from 'react';
import './index.css';
import { vscode } from './utils/vscode';
import { ChatLayout } from './components/ChatLayout';
import { InputArea } from './components/InputArea';

interface Message {
  role: 'ai' | 'user';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Send init
    vscode.postMessage({ command: 'log', text: 'React Webview Initialized' });
    vscode.postMessage({ command: 'init' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'aiMessage':
          setMessages(prev => [...prev, { role: 'ai', content: message.text }]);
          break;
        case 'displayUserMessage':
          setMessages(prev => [...prev, { role: 'user', content: message.text }]);
          break;
        case 'transcription':
          // We need to handle transcription update.
          // Since InputArea controls its own state, we need a way to pass this down?
          // OR InputArea listens to event?
          // OR we lift state up?
          // For now, let's just log it. 
          // Re-implementing: The original script manipulated DOM directly.
          // To update InputArea text, we usually lift state.
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSend = (text: string) => {
    // Optimistic update done via displayUserMessage command from specific component? 
    // Original script: sendAnswer -> displayUserMessage -> postMessage 'answer'.
    // Here:
    setMessages(prev => [...prev, { role: 'user', content: text }]); // Optimistic
    vscode.postMessage({ command: 'answer', text });
  };

  const handleFinish = () => {
    vscode.postMessage({ command: 'done' });
  };

  // Transcription handling:
  // In InputArea, we can listen to global event? Or better, pass a prop 'transcribedText'.
  // But standard pattern is lift state.
  // We'll leave InputArea state local for typing, but handle transcription via prop?
  // Let's modify InputArea later if needed. For now transcription support might be deferred or hacked via EventBus or global.
  // Actually, let's implement a listener in InputArea for simplicity.
  // Wait, InputArea in previous step didn't have listener.

  return (
    <div className="app">
      <button className="finish-button" onClick={handleFinish} id="finishButton">
        完成访谈 / Finish Interview
      </button>

      <ChatLayout messages={messages} />
      <InputArea onSend={handleSend} />
    </div>
  );
}

export default App;
