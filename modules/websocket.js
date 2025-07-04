const hosts = require('./hosts');
const https = require('https');
const WebSocket = require('ws');
const { URL } = require('url');

function setupWebSocketServer(server) {
  server.on('upgrade', (req, socket, head) => {
    // Example URL: /ws/console/:hostId/:instanceName
    const match = req.url.match(/^\/ws\/console\/([^/]+)\/([^/]+)/);
    if (match) {
      const hostId = match[1];
      const instanceName = decodeURIComponent(match[2]);
      handleConsoleWebSocket(server, req, socket, head, hostId, instanceName);
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    }
  });
}

function handleConsoleWebSocket(server, req, socket, head, hostId, instanceName) {
  const wss = new WebSocket.Server({ noServer: true });
  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log('[LXD Console] WS connection for hostId:', hostId, 'instanceName:', instanceName);
    hosts.getHost(hostId, (err, host) => {
      if (err || !host) {
        console.error('[LXD Console] Host lookup failed:', err);
        ws.close();
        return;
      }
      console.log('[LXD Console] Host:', host.address);
      // Try multiple common shells in order
      const shellFallbacks = [
        ['/bin/bash'],
        ['/bin/sh'],
        ['/bin/ash'],
        ['/bin/busybox', 'sh']
      ];
      function tryShells(shells, idx) {
        if (idx >= shells.length) {
          ws.close();
          console.error('[LXD Console] Could not start shell: no fds found for any common shell');
          return;
        }
        tryExec(shells[idx], () => tryShells(shells, idx + 1));
      }
      tryShells(shellFallbacks, 0);

      function tryExec(command, onFail) {
        // Step 1: Start LXD exec session
        const execBody = JSON.stringify({
          command,
          interactive: true,
          environment: { HOME: '/root', TERM: 'xterm' },
          width: 80,
          height: 24,
          'wait-for-websocket': true
        });
        const url = new URL(host.address);
        const options = {
          hostname: url.hostname,
          port: url.port,
          path: `/1.0/instances/${encodeURIComponent(instanceName)}/exec`,
          method: 'POST',
          cert: host.cert,
          key: host.key,
          ca: host.ca || undefined,
          rejectUnauthorized: false,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(execBody),
          }
        };
        const reqExec = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            console.log('[LXD Console] LXD exec API status:', res.statusCode);
            if (res.statusCode !== 202 && res.statusCode !== 200) {
              console.error('[LXD Console] LXD exec API error:', data);
              onFail();
              return;
            }
            let parsed;
            try {
              parsed = JSON.parse(data);
              console.log('[LXD Console] Full parsed response:', parsed);
            } catch (e) {
              console.error('[LXD Console] Exception parsing LXD exec response:', e);
              onFail();
              return;
            }
            const operationId = parsed.operation.split('/').pop();
            // Poll /1.0/operations/<id> up to 20 times to catch fds
            let attempts = 0;
            const maxAttempts = 20;
            const pollDelay = 30; // ms (reduced for faster polling)
            function pollForFds() {
              attempts++;
              const opOptions = {
                hostname: url.hostname,
                port: url.port,
                path: `/1.0/operations/${operationId}`,
                method: 'GET',
                cert: host.cert,
                key: host.key,
                ca: host.ca || undefined,
                rejectUnauthorized: false,
              };
              const opReq = https.request(opOptions, (opRes) => {
                let opData = '';
                opRes.on('data', (chunk) => { opData += chunk; });
                opRes.on('end', () => {
                  let opParsed;
                  try {
                    opParsed = JSON.parse(opData);
                    console.log(`[LXD Console] /operations poll #${attempts}:`, opParsed);
                  } catch (e) {
                    console.error('[LXD Console] Exception parsing /operations response:', e);
                    if (attempts < maxAttempts) return setTimeout(pollForFds, pollDelay);
                    onFail();
                    return;
                  }
                  if (opParsed.metadata && opParsed.metadata.metadata && opParsed.metadata.metadata.fds) {
                    const fds = opParsed.metadata.metadata.fds;
                    console.log('[LXD Console] fds:', fds);
                    const lxdWsUrl = (secret) =>
                      `${host.address.replace('https', 'wss')}/1.0/operations/${operationId}/websocket?secret=${secret}`;
                    if (fds['1']) {
                      // If both stdin and stdout are present (rare for interactive)
                      console.log('[LXD Console] stdout URL:', lxdWsUrl(fds[1]));
                      const stdoutWs = new WebSocket(lxdWsUrl(fds[1]), {
                        cert: host.cert,
                        key: host.key,
                        ca: host.ca || undefined,
                        rejectUnauthorized: false,
                      });
                      stdoutWs.on('open', () => {
                        console.log('[LXD Console] stdoutWs open');
                        console.log('[LXD Console] stdin URL:', lxdWsUrl(fds[0]));
                        const stdinWs = new WebSocket(lxdWsUrl(fds[0]), {
                          cert: host.cert,
                          key: host.key,
                          ca: host.ca || undefined,
                          rejectUnauthorized: false,
                        });
                        stdinWs.on('open', () => console.log('[LXD Console] stdinWs open'));
                        stdinWs.on('error', (e) => console.error('[LXD Console] stdinWs error:', e));
                        // Relay data
                        ws.on('message', (msg) => {
                          if (stdinWs.readyState === WebSocket.OPEN) stdinWs.send(msg);
                        });
                        // Handle close
                        ws.on('close', () => {
                          stdinWs.close();
                          stdoutWs.close();
                          console.log('[LXD Console] Browser WS closed');
                        });
                        stdinWs.on('close', () => {
                          ws.close();
                          console.log('[LXD Console] stdinWs closed');
                        });
                      });
                      stdoutWs.on('message', (msg) => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
                      });
                      stdoutWs.on('close', () => {
                        ws.close();
                        console.log('[LXD Console] stdoutWs closed');
                      });
                      stdoutWs.on('error', (e) => console.error('[LXD Console] stdoutWs error:', e));
                    } else if (fds['0']) {
                      // Only one combined channel (most common for interactive exec)
                      console.log('[LXD Console] single channel URL:', lxdWsUrl(fds[0]));
                      const ioWs = new WebSocket(lxdWsUrl(fds[0]), {
                        cert: host.cert,
                        key: host.key,
                        ca: host.ca || undefined,
                        rejectUnauthorized: false,
                      });
                      let controlWs = null;
                      if (fds['control']) {
                        console.log('[LXD Console] control URL:', lxdWsUrl(fds['control']));
                        controlWs = new WebSocket(lxdWsUrl(fds['control']), {
                          cert: host.cert,
                          key: host.key,
                          ca: host.ca || undefined,
                          rejectUnauthorized: false,
                        });
                        controlWs.on('open', () => console.log('[LXD Console] controlWs open'));
                        controlWs.on('close', () => console.log('[LXD Console] controlWs closed'));
                        controlWs.on('error', (e) => console.error('[LXD Console] controlWs error:', e));
                        controlWs.on('message', (msg) => {
                          // Optionally log or handle control messages
                          // console.log('[LXD Console] controlWs message:', msg);
                        });
                      }
                      ioWs.on('open', () => console.log('[LXD Console] ioWs open'));
                      ioWs.on('error', (e) => console.error('[LXD Console] ioWs error:', e));
                      // Relay data both ways
                      ws.on('message', (msg) => {
                        if (ioWs.readyState === WebSocket.OPEN) ioWs.send(msg);
                      });
                      ioWs.on('message', (msg) => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
                      });
                      // Handle close
                      ws.on('close', () => {
                        ioWs.close();
                        if (controlWs) controlWs.close();
                        console.log('[LXD Console] Browser WS closed');
                      });
                      ioWs.on('close', () => {
                        ws.close();
                        if (controlWs) controlWs.close();
                        console.log('[LXD Console] ioWs closed');
                      });
                    } else {
                      console.error('[LXD Console] No usable fds found');
                      onFail();
                    }
                  } else if (attempts < maxAttempts) {
                    setTimeout(pollForFds, pollDelay);
                  } else {
                    console.error('[LXD Console] No fds found after polling');
                    onFail();
                  }
                });
              });
              opReq.on('error', (e) => {
                console.error('[LXD Console] /operations request error:', e);
                if (attempts < maxAttempts) return setTimeout(pollForFds, pollDelay);
                onFail();
              });
              opReq.end();
            }
            pollForFds();
          });
        });
        reqExec.on('error', (e) => {
          console.error('[LXD Console] LXD exec API request error:', e);
          onFail();
        });
        reqExec.write(execBody);
        reqExec.end();
      }
    });
  });
}

module.exports = { setupWebSocketServer, handleConsoleWebSocket };
