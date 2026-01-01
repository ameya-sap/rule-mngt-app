export async function evaluateRule(promptData, rule) {
    const evaluationLog = [];
    evaluationLog.push(`Evaluating rule: "${rule.name}"`);
    let allConditionsMet = true;
    for (const condition of rule.conditions) {
        const promptValue = promptData[condition.field];
        // Resolve the rule value (it could be a constant or a formula object)
        let resolvedRuleValue = condition.value;
        let ruleValueDescription = JSON.stringify(condition.value);
        // Check if value is a Formula object
        if (typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value)) {
            const formula = condition.value;
            const baseValue = promptData[formula.field];
            if (baseValue === undefined) {
                evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Base field "${formula.field}" for formula not found in prompt data.`);
                allConditionsMet = false;
                break;
            }
            if (typeof baseValue !== 'number') {
                evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Base field "${formula.field}" is not a number (Value: ${baseValue}).`);
                allConditionsMet = false;
                break;
            }
            const multiplier = Number(formula.value);
            if (formula.operator === '*') {
                resolvedRuleValue = baseValue * multiplier;
                ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) * ${multiplier} = ${resolvedRuleValue} ]`;
            }
            else if (formula.operator === '+') {
                resolvedRuleValue = baseValue + multiplier;
                ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) + ${multiplier} = ${resolvedRuleValue} ]`;
            }
            else if (formula.operator === '-') {
                resolvedRuleValue = baseValue - multiplier;
                ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) - ${multiplier} = ${resolvedRuleValue} ]`;
            }
            else if (formula.operator === '/') {
                resolvedRuleValue = baseValue / multiplier;
                ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) / ${multiplier} = ${resolvedRuleValue} ]`;
            }
            else {
                evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Unsupported formula operator "${formula.operator}".`);
                allConditionsMet = false;
                break;
            }
        }
        let conditionMet = false;
        if (promptValue === undefined) {
            evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Field not found in prompt data.`);
            allConditionsMet = false;
            break;
        }
        switch (condition.operator) {
            case '==':
                conditionMet = promptValue == resolvedRuleValue;
                break;
            case '!=':
                conditionMet = promptValue != resolvedRuleValue;
                break;
            case '>':
                conditionMet = promptValue > resolvedRuleValue;
                break;
            case '<':
                conditionMet = promptValue < resolvedRuleValue;
                break;
            case '>=':
                conditionMet = promptValue >= resolvedRuleValue;
                break;
            case '<=':
                conditionMet = promptValue <= resolvedRuleValue;
                break;
            case 'in':
                if (Array.isArray(resolvedRuleValue)) {
                    conditionMet = resolvedRuleValue.includes(promptValue);
                }
                else {
                    evaluationLog.push(`- Operator "in" for field "${condition.field}" requires the rule value to be an array.`);
                    conditionMet = false;
                }
                break;
            default:
                evaluationLog.push(`- Unsupported operator "${condition.operator}" for field "${condition.field}"`);
                conditionMet = false;
        }
        evaluationLog.push(`- Condition: \`${condition.field} ${condition.operator} ${ruleValueDescription}\` (Prompt Value: ${promptValue}). Result: ${conditionMet ? 'MET' : 'NOT MET'}`);
        if (!conditionMet) {
            allConditionsMet = false;
            break;
        }
    }
    if (allConditionsMet) {
        evaluationLog.push(`SUCCESS: All conditions met for rule "${rule.name}".`);
    }
    else {
        evaluationLog.push(`FAILURE: Not all conditions met for rule "${rule.name}".`);
    }
    return { matched: allConditionsMet, log: evaluationLog };
}
