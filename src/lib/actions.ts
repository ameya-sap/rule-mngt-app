'use server';

import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { ExamplePrompt, ExamplePromptSchema, FormRuleSchema, Rule, RuleSchema } from './types';
import { z } from 'zod';
import { suggestRuleComponents } from '@/ai/flows/suggest-rule-components';
import { processBusinessPrompt } from '@/ai/flows/process-business-prompt';
import { generateExamplePrompt as generateExamplePromptFlow } from '@/ai/flows/generate-example-prompt';
import { explainRule } from '@/ai/flows/explain-rule';
import { generateRuleFromPrompt as generateRuleFromPromptFlow } from '@/ai/flows/generate-rule-from-prompt';

function parseValue(value: any) {
  if (value === null || value === undefined || value === '') return value;
  const num = Number(value);
  if (!isNaN(num) && String(num) === String(value)) return num;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'false') return false;
  return value;
}

export async function getRules(): Promise<Rule[]> {
  try {
    const snapshot = await getDocs(collection(db, 'rules'));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Rule));
  } catch (error) {
    console.error("Error fetching rules: ", error);
    return [];
  }
}

export async function getRulesByCategory(businessCategory: string): Promise<Rule[]> {
  try {
    const q = query(collection(db, 'rules'), where('businessCategory', '==', businessCategory));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Rule));
  } catch (error) {
    console.error(`Error fetching rules for category ${businessCategory}: `, error);
    return [];
  }
}

export async function getRule(id: string): Promise<Rule | null> {
  try {
    const docRef = doc(db, 'rules', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Rule;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching rule: ", error);
    return null;
  }
}

export async function saveRule(data: z.infer<typeof FormRuleSchema>) {
  try {
    const validatedData = FormRuleSchema.parse(data);

    const ruleData: Omit<Rule, 'id'> = {
      name: validatedData.name,
      description: validatedData.description,
      businessCategory: validatedData.businessCategory,
      status: validatedData.status,
      conditions: validatedData.conditions.map(c => ({...c, value: parseValue(c.value)})),
      actions: validatedData.actions.map(a => ({
        ...a,
        parameters: JSON.parse(a.parameters),
      })),
    };

    let docId = validatedData.id;
    if (docId) {
      await setDoc(doc(db, 'rules', docId), ruleData);
    } else {
      const docRef = await addDoc(collection(db, 'rules'), ruleData);
      docId = docRef.id;
    }
    
    revalidatePath('/');
    if(docId) revalidatePath(`/rules/${docId}/edit`);

    return { success: true, id: docId };
  } catch (error) {
    console.error("Error saving rule: ", error);
    const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error as Error).message;
    return { success: false, error: message };
  }
}

export async function updateRuleStatus(id: string, status: 'active' | 'inactive') {
  try {
    const docRef = doc(db, 'rules', id);
    await updateDoc(docRef, { status });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error updating status: ", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteRule(id: string) {
  try {
    await deleteDoc(doc(db, 'rules', id));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting rule: ", error);
    return { success: false, error: (error as Error).message };
  }
}


export async function getRuleSuggestions(ruleDescription: string) {
  if (!ruleDescription) {
    return { success: false, error: 'Rule description is required.' };
  }
  try {
    const existingRules = await getRules();
    // Pre-format the parameters into a string for the prompt
    const formattedRules = existingRules.map(rule => ({
      ...rule,
      actions: rule.actions.map(action => ({
        ...action,
        parameters: JSON.stringify(action.parameters),
      })),
    }));

    const suggestions = await suggestRuleComponents({ existingRules: formattedRules, ruleDescription });
    return { success: true, suggestions };
  } catch (error) {
    console.error("Error getting suggestions: ", error);
    return { success: false, error: 'Failed to get AI suggestions. ' + (error as Error).message };
  }
}

export async function importRules(jsonString: string) {
  try {
    const rulesToImport = z.array(RuleSchema.omit({id: true})).parse(JSON.parse(jsonString));
    
    if (rulesToImport.length === 0) {
      return { success: false, error: 'No valid rules found in JSON.' };
    }

    const batch = [];
    for (const rule of rulesToImport) {
      batch.push(addDoc(collection(db, 'rules'), rule));
    }
    await Promise.all(batch);

    revalidatePath('/');
    return { success: true, count: rulesToImport.length };
  } catch (error) {
    console.error("Error importing rules: ", error);
    const message = error instanceof z.ZodError ? "JSON data does not match the required rule format." : (error as Error).message;
    return { success: false, error: message };
  }
}


export async function testBusinessRule(prompt: string) {
  if (!prompt) {
    return { success: false, error: 'Prompt is required.' };
  }
  try {
    const result = await processBusinessPrompt({ prompt });
    return { success: true, result };
  } catch (error) {
    console.error("Error processing business prompt: ", error);
    return { success: false, error: 'Failed to process prompt. ' + (error as Error).message };
  }
}

export async function generateExamplePrompt() {
  try {
    const allRules = await getRules();
    if (allRules.length === 0) {
      return { success: false, error: 'No rules found in the database to generate an example from.' };
    }
    const randomRule = allRules[Math.floor(Math.random() * allRules.length)];
    
    const result = await generateExamplePromptFlow(randomRule);
    
    return { success: true, prompt: result.prompt };
  } catch (error) {
    console.error("Error generating example prompt: ", error);
    return { success: false, error: 'Failed to generate example prompt. ' + (error as Error).message };
  }
}

// Example Prompts Actions
export async function getExamplePrompts(): Promise<ExamplePrompt[]> {
  try {
    const snapshot = await getDocs(collection(db, 'examplePrompts'));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      prompt: doc.data().prompt,
    }));
  } catch (error) {
    console.error("Error fetching example prompts: ", error);
    return [];
  }
}

export async function addExamplePrompt(prompt: string) {
  try {
    if (!prompt.trim()) {
      return { success: false, error: "Prompt cannot be empty." };
    }
    await addDoc(collection(db, 'examplePrompts'), { prompt });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error adding example prompt: ", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteExamplePrompt(id: string) {
  try {
    await deleteDoc(doc(db, 'examplePrompts', id));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting example prompt: ", error);
    return { success: false, error: (error as Error).message };
  }
}


export async function getRuleExplanation(rule: Rule) {
  try {
    const result = await explainRule(rule);
    return { success: true, explanation: result.explanation };
  } catch (error) {
    console.error("Error getting rule explanation: ", error);
    return { success: false, error: 'Failed to get AI explanation. ' + (error as Error).message };
  }
}


export async function generateRuleFromPrompt(prompt: string) {
    if (!prompt) {
      return { success: false, error: 'Prompt is required.' };
    }
    try {
      const rule = await generateRuleFromPromptFlow(prompt);
      return { success: true, rule };
    } catch (error) {
      console.error("Error generating rule from prompt: ", error);
      return { success: false, error: 'Failed to generate rule. ' + (error as Error).message };
    }
  }
