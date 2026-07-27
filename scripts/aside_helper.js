const { spawn } = require('child_process');

/**
 * Runs a block of JavaScript code in the Aside MCP REPL context.
 * 
 * @param {string} code The JavaScript code to run. Must use top-level await and console.log to return results.
 * @returns {Promise<string>} The output printed via console.log inside the REPL.
 */
function runAsideRepl(code) {
  return new Promise((resolve, reject) => {
    // Spawn the aside mcp CLI process
    const cp = spawn(process.env.HOME + '/.local/bin/aside', ['mcp']);
    
    let output = '';
    cp.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          // Only process the specific JSON-RPC response for our request (id: 1)
          if (msg.id === 1 && msg.result) {
            output = msg.result.content.map(c => c.text).join('\n');
            cp.stdin.end();
          } else if (msg.id === 1 && msg.error) {
            reject(new Error(JSON.stringify(msg.error)));
            cp.stdin.end();
          }
        } catch (e) {
          // Ignore non-JSON lines or parse errors
        }
      }
    });

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'repl',
        arguments: {
          title: 'cc-news-automation',
          code: code
        }
      }
    };
    
    cp.stdin.write(JSON.stringify(request) + '\n');
    
    cp.on('close', (code) => {
      if (code !== 0 && !output) {
        reject(new Error(`aside mcp exited with code ${code}`));
      } else {
        resolve(output);
      }
    });
  });
}

module.exports = { runAsideRepl };
