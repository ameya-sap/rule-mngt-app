import { Gemini, InMemoryRunner, MCPToolset } from '@google/adk';
import { createDiscoveryAgent } from './agents/discovery.js';
import { createAnalysisAgent } from './agents/analysis.js';

async function main() {
  const userPrompt = process.argv[2];
  if (!userPrompt) {
    console.error('Please provide a prompt argument');
    process.exit(1);
  }

  console.log(`Processing prompt: "${userPrompt}"`);

  // Initialize Gemini Model
  const model = new Gemini({
    model: 'gemini-2.5-flash',
    vertexai: true,
    project: 'sap-adapter',
    location: 'us-central1'
  });

  // Initialize MCP Toolset
  const mcpToolset = new MCPToolset({
    type: "StreamableHTTPConnectionParams",
    url: "http://127.0.0.1:8080/mcp"
  } as any);

  try {
      // 1. Discovery Phase
      console.log('--- Phase 1: Discovery ---');
      const discoveryAgent = createDiscoveryAgent({ model, tools: [mcpToolset] });
      const discoveryRunner = new InMemoryRunner({ agent: discoveryAgent, appName: 'discovery-agent' });
      
      let selectedRuleId: string | null = null;

      await discoveryRunner.sessionService.createSession({
          appName: 'discovery-agent',
          userId: 'user',
          sessionId: 'session-1'
      });

      const discoveryIterator = discoveryRunner.runAsync({
        userId: 'user',
        sessionId: 'session-1',
        newMessage: { role: 'user', parts: [{ text: userPrompt }] }
      });

      for await (const event of discoveryIterator) {
        const e = event as any;
        if (e.content && (!e.content.parts || e.content.parts.length === 0)) {
            continue;
        }
        
        if (e.content?.parts?.some((p: any) => p.functionCall)) {
            const call = e.content.parts.find((p: any) => p.functionCall).functionCall;
            console.log(`[Discovery] Tool Call: ${call.name}`);
        }

        if (e.content?.parts?.some((p: any) => p.text)) {
            const text = e.content.parts.find((p: any) => p.text).text;
            const match = text.match(/SELECTED_RULE_ID:\s*(\w+)/);
            if (match) {
                selectedRuleId = match[1];
                console.log(`[Discovery] Selected Rule: ${selectedRuleId}`);
            }
        }
      }

      if (!selectedRuleId) {
          console.error('Failed to select a rule.');
          process.exit(1);
      }

      // 2. Analysis Phase
      console.log('\n--- Phase 2: Analysis ---');
      const analysisAgent = createAnalysisAgent({ model, tools: [mcpToolset] });
      const analysisRunner = new InMemoryRunner({ agent: analysisAgent, appName: 'analysis-agent' });

      await analysisRunner.sessionService.createSession({
          appName: 'analysis-agent',
          userId: 'user',
          sessionId: 'session-2'
      });

      const analysisPrompt = `
        Selected Rule ID: ${selectedRuleId}
        Original User Prompt: "${userPrompt}"
        
        Proceed with extraction and evaluation.
      `;

      const analysisIterator = analysisRunner.runAsync({
        userId: 'user',
        sessionId: 'session-2',
        newMessage: { role: 'user', parts: [{ text: analysisPrompt }] }
      });

      for await (const event of analysisIterator) {
         const e = event as any;
         if (e.content && (!e.content.parts || e.content.parts.length === 0)) {
             continue;
         }

         if (e.content?.parts?.some((p: any) => p.functionCall)) {
            const call = e.content.parts.find((p: any) => p.functionCall).functionCall;
            console.log(`[Analysis] Tool Call: ${call.name}`);
        }

        if (e.content?.role === 'model' && e.content.parts[0].text) {
            console.log(`[Analysis] Response: ${e.content.parts[0].text}`);
        }
      }

  } finally {
    if (mcpToolset.close) await mcpToolset.close();
  }
}

main().catch(console.error);
