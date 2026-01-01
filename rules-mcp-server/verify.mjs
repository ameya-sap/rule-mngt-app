import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'build/index.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const requests = [
  // 1. List Tools
  {
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1
  },
  // 2. Call list_rules_by_category
  {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "list_rules_by_category",
      arguments: { category: "Procurement & Sourcing" }
    },
    id: 2
  },
  // 3. Call evaluate_rule_logic (with Formula)
  {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "evaluate_rule_logic",
      arguments: {
        ruleId: "oznryg",
        data: {
          "invoice.materialPrice": 110,
          "purchaseOrder.materialPrice": 100,
          "invoice.quantity": 50,
          "purchaseOrder.quantity": 50
        }
      }
    },
    id: 3
  }
];

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      console.log(`Response for ID ${response.id}:`);
      console.log(JSON.stringify(response, null, 2));

      if (response.id === 3) {
        // Evaluate check
        const content = JSON.parse(response.result.content[0].text);
        if (content.matched) {
          console.log("SUCCESS: Rule matched as expected.");
        } else {
          console.log("FAILURE: Rule did not match.");
        }
        process.exit(0);
      }
    } catch (e) {
      console.error('Failed to parse line:', line);
    }
  }
});

// Send requests sequentially
async function sendRequests() {
  for (const req of requests) {
    console.log(`Sending request ID ${req.id}...`);
    server.stdin.write(JSON.stringify(req) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit between requests
  }
}

sendRequests();
