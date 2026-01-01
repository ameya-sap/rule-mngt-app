import { LlmAgent } from '@google/adk';
export function createAnalysisAgent({ model, tools }) {
    return new LlmAgent({
        name: 'AnalysisAgent',
        model,
        tools,
        instruction: `
      You are the Analysis Agent.
      Your goal is to extract data and evaluate a specific business rule.

      You will be given a Rule ID and a User Prompt.
      
      Follow this process:
      1.  **Get Requirements**: Call 'get_rule_requirements' with the provided Rule ID to understand what data is needed.
      2.  **Extract Data**: 
          - **CRITICAL**: Read the output of 'get_rule_requirements' carefully. It contains a list of fields required by the rule (e.g., fields involved in conditions).
          - Scan the User Prompt to find values for EACH of these required fields.
          - Construct a clean JSON object with the extracted data.
      3.  **Evaluate**: Use 'evaluate_rule_logic' with the extracted data and known Rule ID.
      4.  **Report**: Output the full evaluation result and recommended actions.
    `,
        beforeModelCallback: async ({ request }) => {
            if (request.contents) {
                request.contents = request.contents.filter(c => c.parts && c.parts.length > 0);
            }
            return undefined;
        }
    });
}
