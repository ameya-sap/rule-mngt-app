import { LlmAgent } from '@google/adk';
export function createDiscoveryAgent({ model, tools }) {
    return new LlmAgent({
        name: 'DiscoveryAgent',
        model,
        tools,
        instruction: `
      You are the Discovery Agent.
      Your goal is to identify the best business rule for a given user prompt.

      Follow this process:
      1.  **Get Categories**: Call 'get_all_categories' to see what business categories are available.
      2.  **Infer Category**: Analyze the user prompt to infer the most likely business category from the available list.
      3.  **List Rules**: Use 'list_rules_by_category' to find rules for that category.
      4.  **Select Rule**: Identify the single best matching rule based on its name and description.
      
      OUTPUT:
      You must return the ID of the selected rule clearly in your final response.
      Format: "SELECTED_RULE_ID: <id>"
    `,
        beforeModelCallback: async ({ request }) => {
            if (request.contents) {
                request.contents = request.contents.filter(c => c.parts && c.parts.length > 0);
            }
            return undefined;
        }
    });
}
