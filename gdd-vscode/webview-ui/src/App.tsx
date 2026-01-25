import { useEffect, useState } from 'react';
import './index.css';
import { vscode } from './utils/vscode';
import { ChatLayout } from './components/ChatLayout';
import { InputArea } from './components/InputArea';
import { ModelStatusBar, type ModelStatus } from './components/ModelStatusBar';

interface Message {
  role: 'ai' | 'user';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [llmStatus, setLlmStatus] = useState<ModelStatus>({ connected: false });

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
        case 'status':
          setLlmStatus(message.status);
          break;
        case 'history':
          setMessages(message.messages);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSend = (text: string) => {
    if (text.startsWith('/branch ')) {
      const topic = text.substring(8).trim();
      vscode.postMessage({ command: 'createBranch', topic });
      return;
    }
    if (text === '/merge') {
      vscode.postMessage({ command: 'mergeBranch' });
      return;
    }
    if (text === '/main') {
      vscode.postMessage({ command: 'switchBranch', branchId: 'main' });
      return;
    }

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

      <ModelStatusBar status={llmStatus} />
      <ChatLayout messages={messages} />
      <InputArea onSend={handleSend} disabled={!llmStatus.connected} />
    </div>
  );
}

export default App;
