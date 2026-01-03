import { RulesDecisionLogic } from './logic.js';
async function main() {
    const userPrompt = process.argv[2];
    if (!userPrompt) {
        console.error('Please provide a prompt argument');
        process.exit(1);
    }
    console.log(`Processing prompt: "${userPrompt}"`);
    const logic = new RulesDecisionLogic();
    try {
        const result = await logic.execute(userPrompt, (msg) => console.log(msg));
        if (!result.selectedRuleId) {
            process.exit(1);
        }
    }
    finally {
        await logic.close();
    }
}
main().catch(console.error);
