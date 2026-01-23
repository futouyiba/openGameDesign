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

  const [isFinishing, setIsFinishing] = useState(false);

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
        case 'error':
          setIsFinishing(false); // Reset loading on error
          break;
        case 'transcription':
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]); // Optimistic
    vscode.postMessage({ command: 'answer', text });
  };

  const handleFinish = () => {
    setIsFinishing(true);
    vscode.postMessage({ command: 'done' });
  };

  return (
    <div className="app">
      <button
        className="finish-button"
        onClick={handleFinish}
        id="finishButton"
        disabled={isFinishing}
        style={{ opacity: isFinishing ? 0.5 : 1, cursor: isFinishing ? 'wait' : 'pointer' }}
      >
        {isFinishing ? '生成总结中... / Generating...' : '完成访谈 / Finish Interview'}
      </button>

      <ChatLayout messages={messages} />
      <InputArea onSend={handleSend} />
    </div>
  );
}

export default App;
