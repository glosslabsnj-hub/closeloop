import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Test data - mock menu items
const mockMenuItems = [
  { id: "pizza-1", name: "Margherita Pizza", category: "Pizza", price_cents: 1599 },
  { id: "pizza-2", name: "Pepperoni Pizza", category: "Pizza", price_cents: 1799 },
  { id: "pizza-3", name: "Hawaiian Pizza", category: "Pizza", price_cents: 1899 },
  { id: "pizza-4", name: "Cheese Pizza", category: "Pizza", price_cents: 1499 },
  { id: "pasta-1", name: "Spaghetti Carbonara", category: "Pasta", price_cents: 1599 },
  { id: "pasta-2", name: "Fettuccine Alfredo", category: "Pasta", price_cents: 1699 },
  { id: "pasta-3", name: "Lasagna", category: "Pasta", price_cents: 1899 },
  { id: "calzone-1", name: "Calzone", category: "Specialty", price_cents: 1299 },
  { id: "stromboli-1", name: "Stromboli", category: "Specialty", price_cents: 1399 },
  { id: "wings-1", name: "Buffalo Wings", category: "Wings", price_cents: 1199 },
  { id: "wings-2", name: "Wings (10pc)", category: "Wings", price_cents: 1499 },
  { id: "drink-1", name: "2-Liter Pepsi", category: "Drinks", price_cents: 399 },
  { id: "drink-2", name: "2-Liter Coke", category: "Drinks", price_cents: 399 },
  { id: "side-1", name: "Garlic Bread", category: "Sides", price_cents: 599 },
  { id: "side-2", name: "Caesar Salad", category: "Sides", price_cents: 899 },
  { id: "side-3", name: "Mozzarella Sticks", category: "Sides", price_cents: 799 },
];

// Replicate the findBestMenuMatch function for testing
function findBestMenuMatch(
  spokenName: string,
  menuItems: typeof mockMenuItems
): typeof mockMenuItems[0] | null {
  if (!menuItems.length) return null;

  const normalized = spokenName.toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/pizza$/i, "")
    .replace(/\s*wings?$/i, "")
    .trim();

  // Direct/substring match first
  for (const item of menuItems) {
    const itemNorm = item.name.toLowerCase().replace(/\s+/g, " ");
    if (itemNorm === normalized || 
        itemNorm.includes(normalized) || 
        normalized.includes(itemNorm)) {
      return item;
    }
  }

  // Size-aware matching
  const sizeMatch = normalized.match(/^(large|medium|small|xl|extra[ -]?large|personal)\s+(.+)/i);
  if (sizeMatch) {
    const sizelessName = sizeMatch[2].trim();
    for (const item of menuItems) {
      const itemNorm = item.name.toLowerCase();
      if (itemNorm.includes(sizelessName)) {
        return item;
      }
    }
  }

  // Drink keywords
  const drinkKeywords = ["pepsi", "coke", "coca-cola", "sprite", "dr pepper", "fanta", "7-up", "root beer", 
                         "ginger ale", "water", "lemonade", "iced tea", "sweet tea", "coffee", "espresso"];
  for (const keyword of drinkKeywords) {
    if (normalized.includes(keyword)) {
      const drinkMatch = menuItems.find(m => 
        m.name.toLowerCase().includes(keyword) || 
        m.category.toLowerCase() === "drinks"
      );
      if (drinkMatch) return drinkMatch;
    }
  }

  // Wings matching
  if (normalized.includes("wing") || spokenName.toLowerCase().includes("wing")) {
    const wingsMatch = menuItems.find(m => 
      m.name.toLowerCase().includes("wing") ||
      m.category.toLowerCase() === "wings"
    );
    if (wingsMatch) return wingsMatch;
  }

  // Calzone/stromboli matching
  const italianSpecialties = ["calzone", "stromboli", "stuffed shell", "eggplant parm", "chicken parm", "veal parm"];
  for (const specialty of italianSpecialties) {
    if (normalized.includes(specialty)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(specialty));
      if (match) return match;
    }
  }

  // Pasta matching
  const pastaTypes = ["spaghetti", "fettuccine", "penne", "lasagna", "ravioli", "linguine", "rigatoni", "gnocchi", "tortellini", "manicotti"];
  for (const pasta of pastaTypes) {
    if (normalized.includes(pasta)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(pasta));
      if (match) return match;
    }
  }

  // Side matching
  const sides = ["bruschetta", "garlic bread", "garlic knots", "breadsticks", "calamari", "mozzarella sticks", 
                 "onion rings", "fries", "french fries", "caesar salad", "garden salad", "house salad"];
  for (const side of sides) {
    if (normalized.includes(side)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(side));
      if (match) return match;
    }
  }

  return null;
}

// ==================== PIZZA MATCHING TESTS ====================

Deno.test("Price Match: 'Margherita Pizza' -> Margherita Pizza", () => {
  const result = findBestMenuMatch("Margherita Pizza", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Margherita Pizza");
  assertEquals(result.price_cents, 1599);
});

Deno.test("Price Match: 'Large Margherita' (no 'pizza') -> Margherita Pizza", () => {
  const result = findBestMenuMatch("Large Margherita", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Margherita Pizza");
});

Deno.test("Price Match: 'margherita' lowercase -> Margherita Pizza", () => {
  const result = findBestMenuMatch("margherita", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Margherita Pizza");
});

Deno.test("Price Match: 'Pepperoni' -> Pepperoni Pizza", () => {
  const result = findBestMenuMatch("Pepperoni", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Pepperoni Pizza");
});

Deno.test("Price Match: 'large cheese pizza' -> Cheese Pizza", () => {
  const result = findBestMenuMatch("large cheese pizza", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Cheese Pizza");
});

// ==================== PASTA MATCHING TESTS ====================

Deno.test("Price Match: 'Spaghetti Carbonara' -> Spaghetti Carbonara", () => {
  const result = findBestMenuMatch("Spaghetti Carbonara", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Spaghetti Carbonara");
  assertEquals(result.price_cents, 1599);
});

Deno.test("Price Match: 'lasagna' -> Lasagna", () => {
  const result = findBestMenuMatch("lasagna", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Lasagna");
});

Deno.test("Price Match: 'fettuccine alfredo' -> Fettuccine Alfredo", () => {
  const result = findBestMenuMatch("fettuccine alfredo", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Fettuccine Alfredo");
});

// ==================== CALZONE/STROMBOLI MATCHING TESTS ====================

Deno.test("Price Match: 'calzone' -> Calzone", () => {
  const result = findBestMenuMatch("calzone", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Calzone");
  assertEquals(result.price_cents, 1299);
});

Deno.test("Price Match: '3 calzones' -> Calzone", () => {
  const result = findBestMenuMatch("3 calzones", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Calzone");
});

Deno.test("Price Match: 'stromboli' -> Stromboli", () => {
  const result = findBestMenuMatch("stromboli", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Stromboli");
});

// ==================== WINGS MATCHING TESTS ====================

Deno.test("Price Match: '42 Wings' -> Buffalo Wings (first wings match)", () => {
  const result = findBestMenuMatch("42 Wings", mockMenuItems);
  assertExists(result);
  assertEquals(result.category, "Wings");
});

Deno.test("Price Match: 'buffalo wings' -> Buffalo Wings", () => {
  const result = findBestMenuMatch("buffalo wings", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Buffalo Wings");
});

Deno.test("Price Match: 'chicken wings' plain -> matches Wings category", () => {
  const result = findBestMenuMatch("chicken wings", mockMenuItems);
  assertExists(result);
  assertEquals(result.category, "Wings");
});

// ==================== DRINK MATCHING TESTS ====================

Deno.test("Price Match: '2-liter Pepsi' -> 2-Liter Pepsi", () => {
  const result = findBestMenuMatch("2-liter Pepsi", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "2-Liter Pepsi");
  assertEquals(result.price_cents, 399);
});

Deno.test("Price Match: 'Pepsi' -> 2-Liter Pepsi", () => {
  const result = findBestMenuMatch("Pepsi", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "2-Liter Pepsi");
});

Deno.test("Price Match: 'Coke' -> 2-Liter Coke", () => {
  const result = findBestMenuMatch("Coke", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "2-Liter Coke");
});

// ==================== SIDE MATCHING TESTS ====================

Deno.test("Price Match: 'garlic bread' -> Garlic Bread", () => {
  const result = findBestMenuMatch("garlic bread", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Garlic Bread");
  assertEquals(result.price_cents, 599);
});

Deno.test("Price Match: 'caesar salad' -> Caesar Salad", () => {
  const result = findBestMenuMatch("caesar salad", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Caesar Salad");
});

Deno.test("Price Match: 'mozzarella sticks' -> Mozzarella Sticks", () => {
  const result = findBestMenuMatch("mozzarella sticks", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Mozzarella Sticks");
});

// ==================== EDGE CASES ====================

Deno.test("Price Match: Empty menu items -> null", () => {
  const result = findBestMenuMatch("Margherita Pizza", []);
  assertEquals(result, null);
});

Deno.test("Price Match: Unknown item -> null", () => {
  const result = findBestMenuMatch("Chicken Tikka Masala", mockMenuItems);
  assertEquals(result, null);
});

Deno.test("Price Match: Extra spaces -> still matches", () => {
  const result = findBestMenuMatch("  margherita   pizza  ", mockMenuItems);
  assertExists(result);
  assertEquals(result.name, "Margherita Pizza");
});

// ==================== TOTAL CALCULATION TESTS ====================

function calculateOrderTotal(
  items: Array<{ name: string; qty: number }>,
  menuItems: typeof mockMenuItems
): { totalCents: number; matchedCount: number; unmatchedCount: number } {
  let totalCents = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const item of items) {
    const match = findBestMenuMatch(item.name, menuItems);
    if (match && match.price_cents) {
      totalCents += match.price_cents * item.qty;
      matchedCount++;
    } else {
      unmatchedCount++;
    }
  }

  return { totalCents, matchedCount, unmatchedCount };
}

Deno.test("Total Calc: '1 Margherita Pizza' = $15.99", () => {
  const result = calculateOrderTotal([{ name: "Margherita Pizza", qty: 1 }], mockMenuItems);
  assertEquals(result.totalCents, 1599);
  assertEquals(result.matchedCount, 1);
  assertEquals(result.unmatchedCount, 0);
});

Deno.test("Total Calc: '2 Pepperoni Pizza' = $35.98", () => {
  const result = calculateOrderTotal([{ name: "Pepperoni Pizza", qty: 2 }], mockMenuItems);
  assertEquals(result.totalCents, 3598);
});

Deno.test("Total Calc: '42 Wings, 3 Calzones' matches both", () => {
  const result = calculateOrderTotal([
    { name: "Wings", qty: 42 },
    { name: "Calzone", qty: 3 },
  ], mockMenuItems);
  // Wings: 1199 (base) * 42 = 50358 OR we might match Wings (10pc) at 1499 * 42
  // Calzone: 1299 * 3 = 3897
  assertEquals(result.matchedCount, 2);
  assertEquals(result.unmatchedCount, 0);
});

Deno.test("Total Calc: Mixed order with unmatched item", () => {
  const result = calculateOrderTotal([
    { name: "Margherita Pizza", qty: 1 },
    { name: "Unknown Item XYZ", qty: 1 },
    { name: "2-liter Pepsi", qty: 1 },
  ], mockMenuItems);
  assertEquals(result.matchedCount, 2);
  assertEquals(result.unmatchedCount, 1);
  // Margherita: 1599 + Pepsi: 399 = 1998
  assertEquals(result.totalCents, 1998);
});

Deno.test("Total Calc: Full order scenario", () => {
  const result = calculateOrderTotal([
    { name: "Large Margherita", qty: 2 },
    { name: "Garlic Bread", qty: 1 },
    { name: "Pepsi", qty: 2 },
  ], mockMenuItems);
  // Margherita: 1599 * 2 = 3198
  // Garlic Bread: 599
  // Pepsi: 399 * 2 = 798
  // Total: 4595
  assertEquals(result.totalCents, 4595);
  assertEquals(result.matchedCount, 3);
});
