import { spawn } from 'child_process';
import http from 'http';

// Start the server
const serverProcess = spawn('node', ['build/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '8080' }
});

// Wait for server to start
setTimeout(async () => {
  console.log("Starting verification...");

  try {
    // Send POST request directly to /mcp
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "list_rules_by_category",
        arguments: { category: "Quality Management" }
      },
      id: 1
    });

    console.log("Sending POST to /mcp...");
    const postReq = http.request({
      hostname: '127.0.0.1',
      port: 8080,
      path: `/mcp`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (postRes) => {
      console.log(`POST Response: ${postRes.statusCode}`);
      let responseData = '';
      postRes.on('data', (chunk) => responseData += chunk);
      postRes.on('end', () => {
        console.log(`Result: ${responseData}`);

        // Expect SSE response
        if (responseData.includes('data: ')) {
          const lines = responseData.split('\n');
          let jsonStr = '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              jsonStr = line.substring(6);
              break;
            }
          }

          try {
            const json = JSON.parse(jsonStr);
            if (json.id === 1 && json.result) {
              console.log("SUCCESS: Retrieved response via Stateless HTTP");
              const resultStr = JSON.stringify(json.result);
              console.log("Result Content:", resultStr);

              if (resultStr.includes("q67ols")) {
                console.log("Validation PASSED: Rule ID 'q67ols' found in output.");
                process.exit(0);
              } else {
                console.log("Validation FAILED: Rule ID 'q67ols' NOT found.");
                process.exit(1);
              }
            } else {
              console.log("FAILURE: Invalid JSON-RPC response in SSE data");
              process.exit(1);
            }
          } catch (e) {
            console.log("FAILURE: Parsing SSE data failed: " + e.message);
            process.exit(1);
          }
        } else {
          console.log("FAILURE: Response is not SSE");
          process.exit(1);
        }
      });
    });

    postReq.on('error', (e) => {
      console.error("Request Error:", e);
      process.exit(1);
    });

    postReq.write(postData);
    postReq.end();

  } catch (e) {
    console.error(e);
    serverProcess.kill();
    process.exit(1);
  }
}, 3000);
