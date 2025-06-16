'use client';

import { useState, useEffect, useRef } from 'react';

export default function StreamingComponent() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamType, setStreamType] = useState('json'); // 'json' or 'sse'

  // Function to start streaming
  const startStream = async () => {
    try {
      setError(null);
      setIsConnected(true);

      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/stream?format=${streamType}`, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (streamType === 'sse') {
        // Use EventSource for SSE
        const eventSource = new EventSource(`/api/stream?format=sse`);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
        };
        
        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          setError('Connection error');
          setIsConnected(false);
          eventSource.close();
        };
        
        // Store for cleanup
        abortControllerRef.current.eventSource = eventSource;
        
      } else {
        // Use fetch with ReadableStream for JSON
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream ended');
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
            } catch (parseError) {
              console.warn('Failed to parse JSON:', line, parseError);
            }
          }
        }
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Streaming error:', error);
        setError(error.message);
      }
    } finally {
      setIsConnected(false);
    }
  };

  // Function to stop streaming
  const stopStream = () => {
    if (abortControllerRef.current) {
      if (abortControllerRef.current.eventSource) {
        abortControllerRef.current.eventSource.close();
      }
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
  };

  // Function to send manual data
  const sendManualData = async () => {
    try {
      await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Manual message', 
          value: Math.random() 
        })
      });
    } catch (error) {
      console.error('Failed to send manual data:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Real-time Streaming Demo</h1>
      
      {/* Controls */}
      <div className="mb-4 space-x-2 space-y-2">
        <div className="space-x-2">
          <label>
            <input
              type="radio"
              value="json"
              checked={streamType === 'json'}
              onChange={(e) => setStreamType(e.target.value)}
              disabled={isConnected}
            />
            JSON Stream
          </label>
          <label>
            <input
              type="radio"
              value="sse"
              checked={streamType === 'sse'}
              onChange={(e) => setStreamType(e.target.value)}
              disabled={isConnected}
            />
            Server-Sent Events
          </label>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={startStream}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isConnected ? 'Connected' : 'Start Stream'}
          </button>
          
          <button
            onClick={stopStream}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
          >
            Stop Stream
          </button>
          
          <button
            onClick={sendManualData}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Send Manual Data
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <span className={`inline-block px-2 py-1 rounded text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {error && (
          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
            Error: {error}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          Messages ({messages.length})
          <button
            onClick={() => setMessages([])}
            className="ml-2 text-sm px-2 py-1 bg-gray-200 rounded"
          >
            Clear
          </button>
        </h2>
        
        <div className="max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className="mb-2 p-2 bg-white rounded shadow-sm border-l-4 border-blue-400"
              >
                <div className="text-sm text-gray-600 mb-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(msg, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}