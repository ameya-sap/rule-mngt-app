import fs from 'fs/promises';
import path from 'path';
import { Rule, RuleSchema } from './types.js'; // Note .js extension for ESM
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct absolute path to data file
// rules-mcp-server/build/db.js -> rules-mcp-server/src/db.ts
// We want to reach ../../rules-data/db.json from rules-mcp-server root
const DB_PATH = path.resolve(__dirname, '../../rules-data/db.json');

export async function getRules(): Promise<Rule[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const json = JSON.parse(data);
    // Map entries to array and inject ID
    // Map entries to array and inject ID
    const rules = Object.entries(json.rules).map(([id, rule]) => {
      // Inject ID if not present in the object itself
      return { ...(rule as any), id };
    });

    // Use a safe parsing approach to avoid crashing on one bad rule
    return rules.map(r => {
      try {
        const parsed = RuleSchema.parse(r);
        return parsed;
      } catch (e) {
        console.error(`Skipping invalid rule: ${JSON.stringify(r).substring(0, 50)}...`, e);
        return null;
      }
    }).filter((r): r is Rule => r !== null);
  } catch (error) {
    console.error('Error reading rules:', error);
    return [];
  }
}

export async function getRule(id: string): Promise<Rule | undefined> {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  const json = JSON.parse(data) as { rules: Record<string, Rule> };
  const rule = json.rules[id];
  if (rule) {
    // Inject ID if missing in body (db.json structure might imply ID is the key)
    // But our RuleSchema usually has optional ID.
    // Let's ensure ID is set if possible.
    if (!rule.id) rule.id = id;
    return RuleSchema.parse(rule);
  }
  return undefined;
}

export async function getRulesByCategory(category: string): Promise<Rule[]> {
  const rules = await getRules();
  // Case insensitive match for category
  return rules.filter(r => r.businessCategory.toLowerCase() === category.toLowerCase());
}

export async function getAllCategories(): Promise<string[]> {
  const rules = await getRules();
  const categories = new Set(rules.map(r => r.businessCategory));
  return Array.from(categories);
}
