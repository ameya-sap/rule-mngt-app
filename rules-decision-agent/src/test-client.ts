import { ClientFactory } from '@a2a-js/sdk/client';
import { Message, MessageSendParams } from '@a2a-js/sdk';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  const factory = new ClientFactory();
  // Ensure the server is running on port 4000
  const client = await factory.createFromUrl('http://localhost:4000');

  const prompt = process.argv[2] || 'Submit a new project proposal. Set the project status to Pending and the estimated cost is $1,250,000.';

  const sendParams: MessageSendParams = {
    message: {
      messageId: uuidv4(),
      role: 'user',
      parts: [{ kind: 'text', text: prompt }],
      kind: 'message',
    },
  };

  try {
    console.log('Sending message to agent...');
    const response = await client.sendMessage(sendParams);
    const result = response as Message;
    const textPart = result.parts.find(p => p.kind === 'text');
    if (textPart && textPart.kind === 'text') {
      console.log('Agent response:', textPart.text);
    } else {
      console.log('Agent response (non-text):', JSON.stringify(result.parts));
    }
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
