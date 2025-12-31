
import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE_PATH))) {
  fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });
}

// Initial DB state
const initialData = {
  rules: {},
  examplePrompts: {},
  generateRuleExamplePrompts: {},
};

function readDB() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
  } catch (error) {
    console.error('Error reading DB:', error);
    return initialData;
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

// --- Firestore-like Interface ---

export const db = {}; // Placeholder to match import structure if needed, though we use functions below.

export const collection = (_db: any, collectionName: string) => ({
  type: 'collection',
  path: collectionName,
});

export const doc = (_db: any, collectionName: string, docId?: string) => ({
  type: 'doc',
  path: collectionName,
  id: docId,
});

export const getDocs = async (queryOrCollection: any) => {
  const dbData = readDB();
  const collectionName = queryOrCollection.path; // simplified
  // If it's a query, we might need to handle 'where' clauses.
  // For now, let's assume it's just getting all for the collection unless we implement query logic.

  let docsData = dbData[collectionName] || {};

  // Handle basic filtering if queryOrCollection has filters attached (see 'query' below)
  if (queryOrCollection.filters) {
    docsData = Object.fromEntries(
      Object.entries(docsData).filter(([_, data]: [string, any]) => {
        return queryOrCollection.filters.every((filter: any) => {
          if (filter.op === '==') return data[filter.field] === filter.value;
          return true;
        });
      })
    );
  }

  const docs = Object.entries(docsData).map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true,
  }));
  return { docs };
};

export const getDoc = async (docRef: any) => {
  const dbData = readDB();
  const collectionName = docRef.path;
  const docId = docRef.id;

  const data = dbData[collectionName]?.[docId];
  return {
    id: docId,
    exists: () => !!data,
    data: () => data,
  };
};

export const addDoc = async (collectionRef: any, data: any) => {
  const dbData = readDB();
  const collectionName = collectionRef.path;
  const docId = Math.random().toString(36).substring(7);

  if (!dbData[collectionName]) dbData[collectionName] = {};
  dbData[collectionName][docId] = data;

  writeDB(dbData);
  return { id: docId };
};

export const setDoc = async (docRef: any, data: any) => {
  const dbData = readDB();
  const collectionName = docRef.path;
  const docId = docRef.id;

  if (!dbData[collectionName]) dbData[collectionName] = {};
  dbData[collectionName][docId] = data;

  writeDB(dbData);
};

export const updateDoc = async (docRef: any, data: any) => {
  const dbData = readDB();
  const collectionName = docRef.path;
  const docId = docRef.id;

  if (dbData[collectionName]?.[docId]) {
    dbData[collectionName][docId] = { ...dbData[collectionName][docId], ...data };
    writeDB(dbData);
  }
};

export const deleteDoc = async (docRef: any) => {
  const dbData = readDB();
  const collectionName = docRef.path;
  const docId = docRef.id;

  if (dbData[collectionName]?.[docId]) {
    delete dbData[collectionName][docId];
    writeDB(dbData);
  }
};

export const query = (collectionRef: any, ...constraints: any[]) => {
  return {
    path: collectionRef.path,
    filters: constraints
  };
};

export const where = (field: string, op: string, value: any) => ({
  field, op, value
});
