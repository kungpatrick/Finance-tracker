import { query } from '../config/db.js';

/**
 * Advanced Rule-Based Categorization Service.
 * In a production 2026 environment, this would integrate with an NLP model.
 */
const CATEGORY_MAP: Record<string, string[]> = {
  'Food': ['grocery', 'supermarket', 'restaurant', 'cafe', 'uber eats', 'doordash', 'starbucks', 'mcdonalds', 'dining'],
  'Rent': ['rent', 'mortgage', 'housing', 'property', 'apartment'],
  'Entertainment': ['netflix', 'spotify', 'disney+', 'cinema', 'theatre', 'gaming', 'steam', 'playstation', 'xbox'],
  'Shopping': ['amazon', 'walmart', 'target', 'ebay', 'shopping', 'clothing', 'zara', 'h&m'],
  'Health': ['pharmacy', 'cvs', 'doctor', 'hospital', 'gym', 'fitness', 'medical', 'dental'],
  'Transport': ['uber', 'lyft', 'gas', 'petrol', 'train', 'subway', 'transit', 'parking', 'shell', 'chevron'],
  'Utilities': ['electric', 'water', 'internet', 'comcast', 'verizon', 'att', 'phone', 'utility'],
};

export const suggestCategory = async (description: string, userId?: string): Promise<string> => {
  const desc = description.toLowerCase();

  // 1. Check User History (Self-Learning)
  if (userId && description) {
    try {
      const history = await query(
        `SELECT category, COUNT(*) as frequency 
         FROM transactions 
         WHERE user_id = $1 AND description ILIKE $2 
         GROUP BY category ORDER BY frequency DESC LIMIT 1`,
        [userId, `%${description}%`]
      );
      if (history.rows.length > 0) return history.rows[0].category;
    } catch (e) {
      console.error("History lookup failed", e);
    }
  }
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
};