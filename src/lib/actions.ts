'use server';

import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { FormRuleSchema, Rule, RuleSchema } from './types';
import { z } from 'zod';
import { suggestRuleComponents } from '@/ai/flows/suggest-rule-components';

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
    const suggestions = await suggestRuleComponents({ existingRules, ruleDescription });
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
