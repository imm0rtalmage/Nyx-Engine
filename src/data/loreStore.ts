import { useState, useEffect, useCallback } from "react";
import { 
  MASTER_LORE_DATABASE, 
  LORE_CATEGORIES, 
  LoreFact, 
  LoreCategoryInfo 
} from "./loreDatabase";

export type { LoreFact, LoreCategoryInfo };

const STORAGE_CUSTOM_FACTS = "nyx_custom_lore_facts";
const STORAGE_EDITED_FACTS = "nyx_edited_lore_facts";
const STORAGE_DELETED_IDS = "nyx_deleted_lore_ids";
const STORAGE_CUSTOM_CATEGORIES = "nyx_custom_lore_categories";
const LORE_UPDATE_EVENT = "nyx:lore-store-updated";

// In-memory caches to minimize JSON parsing during tight animation/loading loops
let cachedAllFacts: LoreFact[] | null = null;
let cachedAllCategories: LoreCategoryInfo[] | null = null;

function notifyStoreUpdated() {
  cachedAllFacts = null;
  cachedAllCategories = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LORE_UPDATE_EVENT));
  }
}

/**
 * Load user-created custom categories from localStorage
 */
export function loadCustomCategories(): LoreCategoryInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load custom lore categories from localStorage:", err);
    return [];
  }
}

/**
 * Save or update a custom category
 */
export function saveCustomCategory(category: LoreCategoryInfo): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadCustomCategories();
    const cleanId = category.id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const existingIndex = current.findIndex(c => c.id.toLowerCase() === cleanId);
    
    const preparedCategory: LoreCategoryInfo = {
      ...category,
      id: cleanId,
      isCustom: true
    };

    let updated: LoreCategoryInfo[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = preparedCategory;
    } else {
      updated = [...current, preparedCategory];
    }

    localStorage.setItem(STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to save custom category:", err);
  }
}

/**
 * Delete a custom category and optionally its custom facts
 */
export function deleteCustomCategory(categoryId: string, deleteFacts = false): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadCustomCategories();
    const updated = current.filter(c => c.id.toLowerCase() !== categoryId.toLowerCase());
    localStorage.setItem(STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));

    if (deleteFacts) {
      const customFacts = loadCustomFacts();
      const keptFacts = customFacts.filter(f => f.category.toLowerCase() !== categoryId.toLowerCase());
      localStorage.setItem(STORAGE_CUSTOM_FACTS, JSON.stringify(keptFacts));
    }

    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to delete custom category:", err);
  }
}

/**
 * Load user-created custom facts
 */
export function loadCustomFacts(): LoreFact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_FACTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load custom lore facts from localStorage:", err);
    return [];
  }
}

/**
 * Save a newly added or updated custom fact
 */
export function saveCustomFact(fact: LoreFact): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadCustomFacts();
    const existingIndex = current.findIndex(f => f.id === fact.id);
    
    const factWithFlag: LoreFact = {
      ...fact,
      isCustom: true,
      createdDate: fact.createdDate || new Date().toISOString()
    };

    let updated: LoreFact[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = factWithFlag;
    } else {
      updated = [factWithFlag, ...current];
    }

    localStorage.setItem(STORAGE_CUSTOM_FACTS, JSON.stringify(updated));
    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to save custom fact:", err);
  }
}

/**
 * Load map of edited facts: factId -> Partial<LoreFact>
 */
export function loadEditedFacts(): Record<string, Partial<LoreFact>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_EDITED_FACTS);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (err) {
    console.warn("Failed to load edited facts:", err);
    return {};
  }
}

/**
 * Save user edits to ANY fact (built-in or custom)
 */
export function saveEditedFact(id: string, updates: Partial<LoreFact>): void {
  if (typeof window === "undefined") return;
  try {
    // Check if it's already a custom fact
    const customFacts = loadCustomFacts();
    const customIndex = customFacts.findIndex(f => f.id === id);

    if (customIndex >= 0) {
      const updatedCustom = [...customFacts];
      updatedCustom[customIndex] = {
        ...updatedCustom[customIndex],
        ...updates,
        isEdited: true
      };
      localStorage.setItem(STORAGE_CUSTOM_FACTS, JSON.stringify(updatedCustom));
    } else {
      // It's a built-in fact being modified
      const edits = loadEditedFacts();
      edits[id] = {
        ...(edits[id] || {}),
        ...updates,
        isEdited: true
      };
      localStorage.setItem(STORAGE_EDITED_FACTS, JSON.stringify(edits));
    }

    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to save edited fact:", err);
  }
}

/**
 * Load set of deleted fact IDs
 */
export function loadDeletedFactIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_IDS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (err) {
    console.warn("Failed to load deleted fact IDs:", err);
    return new Set();
  }
}

/**
 * Delete a fact (removes custom fact, or adds built-in fact ID to deleted set)
 */
export function deleteLoreFact(id: string): void {
  if (typeof window === "undefined") return;
  try {
    // 1. If it's a custom fact, remove from custom list
    const customFacts = loadCustomFacts();
    const filteredCustom = customFacts.filter(f => f.id !== id);
    if (filteredCustom.length !== customFacts.length) {
      localStorage.setItem(STORAGE_CUSTOM_FACTS, JSON.stringify(filteredCustom));
    }

    // 2. Also record in deleted set so built-in or cached facts stay deleted
    const deletedIds = loadDeletedFactIds();
    deletedIds.add(id);
    localStorage.setItem(STORAGE_DELETED_IDS, JSON.stringify(Array.from(deletedIds)));

    // 3. Remove any pending edits
    const edits = loadEditedFacts();
    if (edits[id]) {
      delete edits[id];
      localStorage.setItem(STORAGE_EDITED_FACTS, JSON.stringify(edits));
    }

    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to delete lore fact:", err);
  }
}

/**
 * Reset a modified built-in fact back to its factory default state
 */
export function resetLoreFactToDefault(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const edits = loadEditedFacts();
    if (edits[id]) {
      delete edits[id];
      localStorage.setItem(STORAGE_EDITED_FACTS, JSON.stringify(edits));
    }

    const deletedIds = loadDeletedFactIds();
    if (deletedIds.has(id)) {
      deletedIds.delete(id);
      localStorage.setItem(STORAGE_DELETED_IDS, JSON.stringify(Array.from(deletedIds)));
    }

    notifyStoreUpdated();
  } catch (err) {
    console.warn("Failed to reset fact to default:", err);
  }
}

/**
 * Get all available categories (built-in + user-created custom)
 */
export function getAllLoreCategories(): LoreCategoryInfo[] {
  if (cachedAllCategories) return cachedAllCategories;

  const custom = loadCustomCategories();
  const builtIn = LORE_CATEGORIES;

  // Filter out any duplicates
  const existingIds = new Set(builtIn.map(c => c.id.toLowerCase()));
  const uniqueCustom = custom.filter(c => !existingIds.has(c.id.toLowerCase()));

  cachedAllCategories = [...builtIn, ...uniqueCustom];
  return cachedAllCategories;
}

/**
 * Get all active lore facts (built-in + custom, with user edits applied, minus deleted)
 */
export function getAllLoreFacts(): LoreFact[] {
  if (cachedAllFacts) return cachedAllFacts;

  const customFacts = loadCustomFacts();
  const editedMap = loadEditedFacts();
  const deletedIds = loadDeletedFactIds();

  // Process built-in facts
  const processedBuiltIn = MASTER_LORE_DATABASE
    .filter(f => !deletedIds.has(f.id))
    .map(f => {
      const edit = editedMap[f.id];
      if (edit) {
        return {
          ...f,
          ...edit,
          isEdited: true
        };
      }
      return f;
    });

  // Process custom facts
  const processedCustom = customFacts
    .filter(f => !deletedIds.has(f.id))
    .map(f => {
      const edit = editedMap[f.id];
      if (edit) {
        return {
          ...f,
          ...edit,
          isEdited: true
        };
      }
      return f;
    });

  cachedAllFacts = [...processedCustom, ...processedBuiltIn];
  return cachedAllFacts;
}

/**
 * Get lore facts for a specific category or universe slug
 */
export function getLoreFactsByCategory(categoryId: string): LoreFact[] {
  const all = getAllLoreFacts();
  if (!categoryId || categoryId === "all") return all;
  return all.filter(f => f.category.toLowerCase() === categoryId.toLowerCase());
}

/**
 * Get lore facts matching an array of category/universe index IDs
 */
export function getLoreFactsByMultipleCategories(categoryIds: string[]): LoreFact[] {
  if (!categoryIds || categoryIds.length === 0) return getAllLoreFacts();
  const set = new Set(categoryIds.map(c => c.toLowerCase()));
  if (set.has("all")) return getAllLoreFacts();
  return getAllLoreFacts().filter(f => set.has(f.category.toLowerCase()));
}

/**
 * Search across all available lore facts
 */
export function searchLoreFacts(query: string, categoryFilter?: string): LoreFact[] {
  const pool = (!categoryFilter || categoryFilter === "all")
    ? getAllLoreFacts()
    : getLoreFactsByCategory(categoryFilter);

  if (!query || !query.trim()) return pool;

  const q = query.toLowerCase().trim();
  return pool.filter(f =>
    f.fact.toLowerCase().includes(q) ||
    f.universe.toLowerCase().includes(q) ||
    f.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Get dynamic count of facts in a given category
 */
export function getCategoryFactCount(categoryId: string): number {
  if (categoryId === "all") return getAllLoreFacts().length;
  return getLoreFactsByCategory(categoryId).length;
}

/**
 * Import multiple distilled lore facts into the Codex
 */
export function importLoreFacts(
  facts: LoreFact[], 
  newCategory?: LoreCategoryInfo
): { importedCount: number } {
  if (!facts || facts.length === 0) return { importedCount: 0 };

  // If a new universe/category is provided and doesn't exist, create it!
  if (newCategory) {
    const existingCats = getAllLoreCategories();
    const exists = existingCats.some(c => c.id.toLowerCase() === newCategory.id.toLowerCase());
    if (!exists) {
      saveCustomCategory(newCategory);
    }
  }

  const currentCustom = loadCustomFacts();
  const existingFactTexts = new Set([
    ...currentCustom.map(f => f.fact.trim().toLowerCase()),
    ...MASTER_LORE_DATABASE.map(f => f.fact.trim().toLowerCase())
  ]);

  const toAdd: LoreFact[] = [];
  for (const f of facts) {
    // Avoid exact duplicate fact texts
    if (!existingFactTexts.has(f.fact.trim().toLowerCase())) {
      toAdd.push({
        ...f,
        id: f.id || `lore-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        isCustom: true,
        createdDate: f.createdDate || new Date().toISOString()
      });
      existingFactTexts.add(f.fact.trim().toLowerCase());
    }
  }

  if (toAdd.length > 0) {
    const updated = [...toAdd, ...currentCustom];
    localStorage.setItem(STORAGE_CUSTOM_FACTS, JSON.stringify(updated));
    notifyStoreUpdated();
  }

  return { importedCount: toAdd.length };
}

/**
 * React Hook that subscribes to Lore Store updates
 */
export function useLoreStore() {
  const [facts, setFacts] = useState<LoreFact[]>(() => getAllLoreFacts());
  const [categories, setCategories] = useState<LoreCategoryInfo[]>(() => getAllLoreCategories());
  const [customFacts, setCustomFacts] = useState<LoreFact[]>(() => loadCustomFacts());
  const [customCategories, setCustomCategories] = useState<LoreCategoryInfo[]>(() => loadCustomCategories());

  const refresh = useCallback(() => {
    cachedAllFacts = null;
    cachedAllCategories = null;
    setFacts(getAllLoreFacts());
    setCategories(getAllLoreCategories());
    setCustomFacts(loadCustomFacts());
    setCustomCategories(loadCustomCategories());
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener(LORE_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(LORE_UPDATE_EVENT, handleUpdate);
    };
  }, [refresh]);

  return {
    facts,
    allFacts: facts,
    categories,
    allCategories: categories,
    customFacts,
    customCategories,
    refresh,
    saveCustomCategory,
    saveCategory: saveCustomCategory,
    deleteCustomCategory,
    deleteCategory: deleteCustomCategory,
    saveCustomFact,
    saveEditedFact,
    saveFact: (fact: LoreFact) => {
      if (fact.isCustom || !fact.id.startsWith("lore-fact-")) {
        saveCustomFact(fact);
      } else {
        saveEditedFact(fact.id, fact);
      }
    },
    deleteLoreFact,
    deleteFact: deleteLoreFact,
    resetLoreFactToDefault,
    resetFactToDefault: resetLoreFactToDefault,
    importLoreFacts
  };
}
