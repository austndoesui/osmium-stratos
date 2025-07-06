import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../../components/mainlayout';
// Import xterm.js and CSS
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Link } from 'react-router-dom';

export default function Console() {
  const { hostId, instanceName } = useParams();
  const termRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const wsRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const navPlaceholderRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [isLoading, setIsLoading] = useState(true);
  const terminalRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    // Move the navigation bar from mainlayout to below the instance name
    setTimeout(() => {
      const nav = document.getElementById('instance-nav');
      const placeholder = navPlaceholderRef.current;
      if (nav && placeholder) {
        nav.style.display = 'block';
        nav.style.position = 'static';
        nav.style.width = 'auto';
        placeholder.appendChild(nav);
      }
    }, 10);

    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: fontSize,
      fontFamily: '"JetBrains Mono", monospace',
      theme: { 
        background: '#0f172a', // Slightly darker blue than the main background
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bbbbbb',
        brightBlack: '#555555',
        brightRed: '#ff5555',
        brightGreen: '#50fa7b',
        brightYellow: '#f1fa8c',
        brightBlue: '#bd93f9',
        brightMagenta: '#ff79c6',
        brightCyan: '#8be9fd',
        brightWhite: '#ffffff'
      },
      allowTransparency: true,
      scrollback: 5000,
    });
    
    terminalRef.current = term;
    
    // Create fit addon to make terminal responsive
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    
    // Set loading state explicitly
    setIsLoading(true);
    setLoadingProgress(0);
    
    // Animate the progress bar over 3 seconds
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        // Increase progress by 2% each interval
        const newProgress = prev + 2;
        // Cap at 95% until connection is actually established
        return Math.min(newProgress, 95);
      });
    }, 60); // 60ms interval gives 50 steps over 3 seconds
    
    // Set a minimum loading time of 3 seconds
    loadingTimerRef.current = setTimeout(() => {
      // Clear the progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Set progress to 100% and hide the loading overlay
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 200); // Short delay to show 100% before hiding
    }, 3000);
    
    term.open(termRef.current);
    
    // Try to fit the terminal to the container
    try {
      fitAddon.fit();
    } catch (e) {
      console.error('Error fitting terminal:', e);
    }
    
    term.focus();

    // Connect to backend WebSocket
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${window.location.host}/ws/console/${hostId}/${encodeURIComponent(instanceName)}`;
    const ws = new window.WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log("WebSocket connection opened");
      setConnectionStatus('connected');
      
      // Update progress to at least 80% when connection is established
      setLoadingProgress(prev => Math.max(prev, 80));
      
      // Don't immediately hide the loading overlay
      // Instead, let the timer handle it after 3 seconds
      // Don't write any connection message to the terminal
    };
    
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      } else {
        term.write(event.data);
      }
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setConnectionStatus('disconnected');
      
      // Clear the loading timer if it's still running
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      
      // Clear the progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setIsLoading(false);
      term.writeln('\r\n\x1b[1;31mDisconnected from console\x1b[0m');
    };
    
    ws.onerror = (e) => {
      console.log("WebSocket error occurred", e);
      setConnectionStatus('error');
      
      // Clear the loading timer if it's still running
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      
      // Clear the progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setIsLoading(false);
      setError('Failed to connect to console');
      term.writeln('\r\n\x1b[1;31mWebSocket error\x1b[0m');
      console.error('WebSocket error:', e);
    };

    // Send terminal input to backend
    term.onData(data => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.error('Error during resize:', e);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial fit after a short delay to ensure container is properly sized
    setTimeout(handleResize, 100);

    // Handle fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      // Clear the loading timer if it's still running
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      
      // Clear the progress animation
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
      ws.close();
      }
      term.dispose();
    };
  }, [hostId, instanceName, fontSize]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (terminalContainerRef.current.requestFullscreen) {
        terminalContainerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
          setTimeout(() => {
            if (fitAddonRef.current) {
              try {
                fitAddonRef.current.fit();
              } catch (e) {
                console.error('Error fitting terminal in fullscreen:', e);
              }
            }
          }, 100);
        }).catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Send common terminal commands
  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(command);
    }
  };

  // Increase font size
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  // Decrease font size
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };

  // Clear terminal (sends clear command)
  const clearTerminal = () => {
    sendCommand('\u000C'); // Form feed character (clear)
  };

  // Force reconnect
  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      setIsLoading(true);
      setLoadingProgress(0);
      
      // Animate the progress bar for reconnection
      progressIntervalRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + 2;
          return Math.min(newProgress, 95);
        });
      }, 60);
      
      // Set a minimum loading time of 3 seconds for reconnection
      loadingTimerRef.current = setTimeout(() => {
        // Clear the progress animation
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Set progress to 100% and hide the loading overlay
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }, 3000);
      
      // Reconnect after a short delay
      setTimeout(() => {
        const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsProto}://${window.location.host}/ws/console/${hostId}/${encodeURIComponent(instanceName)}`;
        const ws = new window.WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.binaryType = 'arraybuffer';
        
        ws.onopen = () => {
          setConnectionStatus('connected');
          setLoadingProgress(prev => Math.max(prev, 80));
          // Let the timer handle hiding the loading overlay
          // Don't write any reconnection message
        };
        
        ws.onmessage = (event) => {
          if (terminalRef.current) {
            if (event.data instanceof ArrayBuffer) {
              terminalRef.current.write(new Uint8Array(event.data));
            } else {
              terminalRef.current.write(event.data);
            }
          }
        };
        
        ws.onclose = () => {
          setConnectionStatus('disconnected');
          
          // Clear the loading timer if it's still running
          if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
          
          // Clear the progress animation
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          
          setIsLoading(false);
          if (terminalRef.current) {
            terminalRef.current.writeln('\r\n\x1b[1;31mDisconnected from console\x1b[0m');
          }
        };
        
        ws.onerror = (e) => {
          setConnectionStatus('error');
          
          // Clear the loading timer if it's still running
          if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
          
          // Clear the progress animation
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          
          setIsLoading(false);
          setError('Failed to connect to console');
          if (terminalRef.current) {
            terminalRef.current.writeln('\r\n\x1b[1;31mWebSocket error\x1b[0m');
          }
          console.error('WebSocket error:', e);
        };
      }, 1000);
    }
  };

  const content = (
    <>
      {/* Breadcrumb navigation */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to="/instances" className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                  Instances
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to={`/instance/${hostId}/${instanceName}`} className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2">
                  {instanceName}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">Console</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main heading */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold text-white">{instanceName}</h1>
        <div className="flex items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-900/40 text-green-400' :
            connectionStatus === 'disconnected' ? 'bg-red-900/40 text-red-400' :
            connectionStatus === 'error' ? 'bg-red-900/40 text-red-400' :
            'bg-yellow-900/40 text-yellow-400'
          }`}>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'disconnected' ? 'Disconnected' :
             connectionStatus === 'error' ? 'Connection Error' :
             'Connecting...'}
          </span>
          {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
            <button 
              onClick={reconnect}
              className="ml-2 px-3 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 text-xs rounded"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation placeholder - the actual nav is in mainlayout.jsx */}
      <div ref={navPlaceholderRef} className="mb-6 pt-4"></div>
      
      {/* Terminal container */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden">
        {/* Terminal toolbar */}
        <div className="p-2 border-b border-gray-700 bg-gray-900 flex flex-wrap items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-white mr-4">Console</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={decreaseFontSize}
              className="p-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
              title="Decrease font size"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-xs text-gray-300">{fontSize}px</span>
            <button 
              onClick={increaseFontSize}
              className="p-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
              title="Increase font size"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Terminal with loading overlay */}
        <div 
          ref={terminalContainerRef} 
          className={`relative bg-[#0f172a] p-2 w-full ${isFullscreen ? 'fullscreen-terminal' : ''}`}
          style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 300px)', minHeight: '400px', position: 'relative' }}
        >
          <div ref={termRef} className="h-full w-full" />
          
          {/* Loading overlay - positioned absolutely over the terminal */}
          {isLoading && (
            <div 
              className="absolute top-0 left-0 right-0 bottom-0 bg-[#0f172a] bg-opacity-95 flex flex-col items-center justify-center"
              style={{ zIndex: 1000 }}
            >
              <div className="w-full max-w-md px-8 mb-6">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-700">
                    <div 
                      style={{ width: `${loadingProgress}%` }}
                      className="transition-all duration-300 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    ></div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">Establishing connection</h3>
              <p className="text-gray-300 text-lg">Connecting to {instanceName}...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Connection error message */}
      {error && (
        <div className="mt-4 bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
    </>
  );

  return <MainLayout>{content}</MainLayout>;
}
