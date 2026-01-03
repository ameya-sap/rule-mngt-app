import { Gemini, InMemoryRunner, MCPToolset } from '@google/adk';
import { createDiscoveryAgent } from './agents/discovery.js';
import { createAnalysisAgent } from './agents/analysis.js';

export interface RulesDecisionResult {
  selectedRuleId: string | null;
  analysisResponse: string | null;
  logs: string[];
}

export class RulesDecisionLogic {
  private model: Gemini;
  private mcpToolset: MCPToolset;

  constructor() {
    this.model = new Gemini({
      model: 'gemini-2.5-flash',
      vertexai: true,
      project: 'sap-adapter',
      location: 'us-central1'
    });

    this.mcpToolset = new MCPToolset({
      type: "StreamableHTTPConnectionParams",
      url: "http://127.0.0.1:8080/mcp"
    } as any);
  }

  async close() {
    if (this.mcpToolset.close) {
      await this.mcpToolset.close();
    }
  }

  async execute(userPrompt: string, logCallback?: (msg: string) => void): Promise<RulesDecisionResult> {
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      if (logCallback) logCallback(msg);
    };

    let selectedRuleId: string | null = null;
    let analysisResponse: string | null = null;

    try {
      // 1. Discovery Phase
      log('--- Phase 1: Discovery ---');
      const discoveryAgent = createDiscoveryAgent({ model: this.model, tools: [this.mcpToolset] });
      const discoveryRunner = new InMemoryRunner({ agent: discoveryAgent, appName: 'discovery-agent' });

      await discoveryRunner.sessionService.createSession({
        appName: 'discovery-agent',
        userId: 'user',
        sessionId: 'session-1' // In a real app, this might need to be unique per run if concurrent
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
          log(`[Discovery] Tool Call: ${call.name}`);
        }

        if (e.content?.parts?.some((p: any) => p.text)) {
          const text = e.content.parts.find((p: any) => p.text).text;
          const match = text.match(/SELECTED_RULE_ID:\s*(\w+)/);
          if (match) {
            selectedRuleId = match[1];
            log(`[Discovery] Selected Rule: ${selectedRuleId}`);
          }
        }
      }

      if (!selectedRuleId) {
        log('Failed to select a rule.');
        return { selectedRuleId, analysisResponse, logs };
      }

      // 2. Analysis Phase
      log('\n--- Phase 2: Analysis ---');
      const analysisAgent = createAnalysisAgent({ model: this.model, tools: [this.mcpToolset] });
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
          log(`[Analysis] Tool Call: ${call.name}`);
        }

        if (e.content?.role === 'model' && e.content.parts[0].text) {
          const text = e.content.parts[0].text;
          log(`[Analysis] Response: ${text}`);
          // Accumulate response if streaming, or just take the last one? 
          // Usually models output chunks. If this is streaming chunks, we should accumulate.
          // But InMemoryRunner often yields full turns or partials. 
          // The original code just logged it. I'll assume it's the final text for now or accumulate.
          // For now, let's just use the last text part as the "response" logic-wise, 
          // but effectively we might want to concatenate if it was streaming multiple parts.
          // Given ADK often yields full messages in some modes, let's just append.
          analysisResponse = text;
        }
      }

    } catch (error: any) {
      log(`Error: ${error.message}`);
    }

    return { selectedRuleId, analysisResponse, logs };
  }
}
