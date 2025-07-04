import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
// Import xterm.js and CSS
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

export default function Console() {
  const { hostId, instanceName } = useParams();
  const termRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 16,
      theme: { background: '#1a1a1a' },
      cols: 80,
      rows: 24,
    });
    term.open(termRef.current);
    term.focus();

    // Connect to backend WebSocket
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${window.location.host}/ws/console/${hostId}/${encodeURIComponent(instanceName)}`;
    const ws = new window.WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      term.writeln('\x1b[1;32mConnected to LXD Console\x1b[0m');
    };
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      } else {
        term.write(event.data);
      }
    };
    ws.onclose = () => {
      term.writeln('\r\n\x1b[1;31mDisconnected from LXD Console\x1b[0m');
    };
    ws.onerror = () => {
      term.writeln('\r\n\x1b[1;31mWebSocket error\x1b[0m');
    };

    // Send terminal input to backend
    term.onData(data => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    // Cleanup
    return () => {
      ws.close();
      term.dispose();
    };
  }, [hostId, instanceName]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h2 className="text-xl text-white mb-2">Console: {instanceName} on {hostId}</h2>
      <div ref={termRef} className="w-full max-w-4xl h-[480px] bg-black rounded shadow" style={{ minHeight: 400 }} />
    </div>
  );
}
