import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard, Message, AGENT_CARD_PATH } from '@a2a-js/sdk';
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from '@a2a-js/sdk/server';
import { agentCardHandler, jsonRpcHandler, restHandler, UserBuilder } from '@a2a-js/sdk/server/express';
import { RulesDecisionLogic } from './logic.js';

// 1. Define the agent's identity card.
const rulesAgentCard: AgentCard = {
  name: 'Rules Decision Agent',
  description: 'An agent that selects and evaluates business rules based on user prompts.',
  protocolVersion: '0.3.0',
  version: '1.0.0',
  url: 'http://localhost:4000/a2a/jsonrpc',
  skills: [{
    id: 'decision',
    name: 'Rule Decision',
    description: 'Selects a rule and analyzes it against the prompt.',
    tags: ['decision', 'rules']
  }],
  capabilities: {
    pushNotifications: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  additionalInterfaces: [
    {
      url: 'http://localhost:4000/a2a/jsonrpc',
      transport: 'JSONRPC'
    },
    {
      url: 'http://localhost:4000/a2a/rest',
      transport: 'HTTP+JSON'
    },
  ],
};

// 2. Implement the agent's logic.
class RulesDecisionExecutor implements AgentExecutor {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    console.error('EXECUTING RulesDecisionExecutor');
    console.error('RequestContext keys:', Object.keys(requestContext));
    const message = (requestContext as any).userMessage;
    if (!message || message.kind !== 'message') {
      console.error('Invalid message kind or missing message');
      eventBus.finished();
      return;
    }

    const userPrompt = message.parts.find((p: any) => p.kind === 'text')?.text;
    if (!userPrompt) {
      eventBus.finished();
      return;
    }

    const logic = new RulesDecisionLogic();
    try {
      const result = await logic.execute(userPrompt, (msg) => {
        // Optional: Send intermediate logs as status updates or debug messages?
        // For now, let's just log to server console
        console.log(`[Logic] ${msg}`);
      });

      let responseText = '';
      if (result.selectedRuleId) {
        responseText += `Selected Rule ID: ${result.selectedRuleId}\n`;
      }
      if (result.analysisResponse) {
        responseText += `\nAnalysis:\n${result.analysisResponse}`;
      }

      if (!responseText) {
        responseText = "Could not select a rule or generate analysis.";
      }

      const responseMessage: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [{ kind: 'text', text: responseText }],
        contextId: requestContext.contextId,
      };

      eventBus.publish(responseMessage);
    } catch (e) {
      console.error('Error executing logic:', e);
      const errorMessage: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [{ kind: 'text', text: 'An error occurred during execution.' }],
        contextId: requestContext.contextId,
      };
      eventBus.publish(errorMessage);
    } finally {
      await logic.close();
      eventBus.finished();
    }
  }

  cancelTask = async (): Promise<void> => {
    // Cancellation logic if needed
  };
}

// 3. Set up and run the server.
const agentExecutor = new RulesDecisionExecutor();
const requestHandler = new DefaultRequestHandler(
  rulesAgentCard,
  new InMemoryTaskStore(),
  agentExecutor
);

const app = express();

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use('/a2a/jsonrpc', jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use('/a2a/rest', restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Rules Decision Agent Server started on http://localhost:${PORT}`);
});
