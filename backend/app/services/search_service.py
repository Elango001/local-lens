import difflib
from typing import Dict, List, Set, Tuple, Optional

# Taxonomy of Categories and their comprehensive semantic synonym lists
CATEGORY_SYNONYMS: Dict[str, List[str]] = {
    "Restaurant & Cafe": [
        "food", "foods", "eat", "eats", "dining", "dine", "meal", "meals",
        "restaurant", "restaurants", "cafe", "cafes", "coffee", "bakery", "bakes",
        "bakeries", "breakfast", "lunch", "dinner", "brunch", "buffet", "buffets",
        "dessert", "desserts", "snack", "snacks", "drink", "drinks", "pizza",
        "burger", "burgers", "pastry", "pastries", "sourdough", "kitchen", "dishes",
        "bistro", "takeout", "cuisine", "tasty", "delicious"
    ],
    "Electronics & Retail": [
        "electronics", "electronic", "tech", "technology", "phone", "phones",
        "mobile", "mobiles", "gadget", "gadgets", "laptop", "laptops", "computer",
        "computers", "repair", "repairs", "screen", "screens", "screenguard",
        "glass", "tempered", "battery", "batteries", "hardware", "device", "devices",
        "accessories", "charger", "chargers", "cable", "cables", "tablet", "tablets"
    ],
    "Retail & Fashion": [
        "retail", "fashion", "clothes", "clothing", "wear", "apparel", "outfit",
        "outfits", "dress", "dresses", "shirt", "shirts", "tee", "tees", "tshirt",
        "tshirts", "jeans", "denim", "pants", "trousers", "shoes", "sneakers",
        "streetwear", "style", "boutique", "shop", "shopping", "jacket", "jackets",
        "hoodie", "hoodies", "cotton", "garments"
    ],
    "Services & Beauty": [
        "services", "service", "beauty", "salon", "salons", "spa", "spas",
        "massage", "massages", "aromatherapy", "hair", "haircut", "haircuts",
        "styling", "facial", "facials", "skincare", "skin", "nails", "grooming",
        "cosmetics", "therapy", "wellness", "barber", "pedicure", "manicure"
    ],
    "Health & Fitness": [
        "health", "fitness", "gym", "gyms", "workout", "workouts", "exercise",
        "exercises", "training", "trainer", "trainers", "functional", "muscle",
        "nutrition", "yoga", "bodybuilding", "weightloss", "crossfit", "strength",
        "cardio", "weights"
    ],
}

# Compile a flat unique vocabulary list for fast typo correction
ALL_VOCABULARY: List[str] = []
for cat, words in CATEGORY_SYNONYMS.items():
    ALL_VOCABULARY.extend(words)
ALL_VOCABULARY = sorted(list(set(ALL_VOCABULARY)))

def correct_word_typo(word: str) -> str:
    """
    Checks if a single word has a close match in the vocabulary using Levenshtein-like diff.
    Only applies to words with length > 3 to avoid corrupting short acronyms or words.
    """
    w = word.lower().strip()
    if len(w) <= 3:
        return w
    
    # Exact match check
    if w in ALL_VOCABULARY:
        return w
    
    # Find close match with 75% similarity threshold
    matches = difflib.get_close_matches(w, ALL_VOCABULARY, n=1, cutoff=0.75)
    if matches:
        return matches[0]
    
    return w

def expand_search_query(query_text: str) -> Tuple[List[str], List[str], Optional[str]]:
    """
    Takes raw search query (e.g. "resturant" or "food").
    Returns:
    - expanded_terms: list of search keywords and synonyms
    - matched_categories: list of business categories that match intent
    - corrected_query: if typo was detected, returns the corrected string
    """
    # Guard against oversized payloads (max 100 chars, max 8 tokens)
    raw = query_text.strip()[:100].lower()
    if not raw:
        return [], [], None

    tokens = raw.split()[:8]
    corrected_tokens = []
    has_typo_correction = False

    for token in tokens:
        corrected = correct_word_typo(token)
        if corrected != token:
            has_typo_correction = True
        corrected_tokens.append(corrected)

    corrected_query_str = " ".join(corrected_tokens) if has_typo_correction else None

    # Gather search terms (original query, corrected query, individual tokens)
    expanded_terms: Set[str] = set()
    expanded_terms.add(raw)
    if corrected_query_str:
        expanded_terms.add(corrected_query_str)
    
    for t in tokens + corrected_tokens:
        expanded_terms.add(t)

    # Detect matched categories
    matched_categories: Set[str] = set()
    for cat, synonyms in CATEGORY_SYNONYMS.items():
        for term in list(expanded_terms):
            if term in synonyms:
                matched_categories.add(cat)
                # Also include synonyms of that category to broaden search
                # e.g. "food" adds "bakery", "brunch", "buffet", "cafe"
                for s in synonyms[:8]:
                    expanded_terms.add(s)
            elif term in cat.lower():
                matched_categories.add(cat)

    return list(expanded_terms), list(matched_categories), corrected_query_str
