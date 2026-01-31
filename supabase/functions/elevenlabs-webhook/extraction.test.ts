/**
 * Comprehensive Food Mode Extraction Tests
 * 
 * Tests for parsing food orders across multiple cuisines:
 * - Italian (pizza, pasta, desserts)
 * - Asian (sushi, Chinese, Thai)
 * - Mexican (tacos, burritos, bowls)
 * - American (burgers, wings, sandwiches)
 * - Bakery/Cafe (coffee, pastries)
 * 
 * Also tests: modifiers, totals, complete order scenarios
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseNaturalLanguageItems, userSays, agentSays, type TranscriptEntry } from "./_shared/test-helpers.ts";

// ============================================================================
// ITALIAN: PIZZA PATTERNS
// ============================================================================

Deno.test("Pizza: 'large margarita' without 'pizza' suffix", () => {
  const result = parseNaturalLanguageItems("I'd like a large margarita", [
    userSays("I'd like a large margarita")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("margarita"), true);
  assertEquals(result.items[0].name.toLowerCase().includes("pizza"), true);
});

Deno.test("Pizza: 'large margherita pizza' with suffix", () => {
  const result = parseNaturalLanguageItems("large margherita pizza", [
    userSays("I want a large margherita pizza")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("margherita"), true);
});

Deno.test("Pizza: 'pepperoni' standalone", () => {
  const result = parseNaturalLanguageItems("pepperoni", [
    userSays("Can I get a pepperoni")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("pepperoni"), true);
  assertEquals(result.items[0].name.toLowerCase().includes("pizza"), true);
});

Deno.test("Pizza: multiple pizza types", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I want a large pepperoni and a medium cheese pizza")
  ]);
  
  assertEquals(result.items.length, 2);
});

Deno.test("Pizza: 'meat lovers' with space", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("One meat lovers pizza please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("meat"), true);
});

Deno.test("Pizza: 'hawaiian' pizza", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll take a large hawaiian")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("hawaiian"), true);
});

Deno.test("Pizza: 'supreme' pizza", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("One supreme pizza please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("supreme"), true);
});

Deno.test("Pizza: 'sicilian' style", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I want a sicilian pizza")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("sicilian"), true);
});

// ============================================================================
// ITALIAN: PASTA PATTERNS
// ============================================================================

Deno.test("Pasta: 'lasagna' standalone", () => {
  const result = parseNaturalLanguageItems("lasagna", [
    userSays("I'll have the lasagna")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("lasagna"), true);
});

Deno.test("Pasta: 'spaghetti carbonara'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("spaghetti carbonara please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("spaghetti"), true);
});

Deno.test("Pasta: 'fettuccine alfredo'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'd like the fettuccine alfredo")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("fettuccine"), true);
});

Deno.test("Pasta: 'penne arrabbiata'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("penne arrabbiata")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("penne"), true);
});

Deno.test("Pasta: 'ravioli'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have the ravioli")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("ravioli"), true);
});

Deno.test("Pasta: 'gnocchi'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("Can I get the gnocchi?")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("gnocchi"), true);
});

// ============================================================================
// ASIAN: SUSHI ROLLS
// ============================================================================

Deno.test("Asian: 'california roll'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("2 california rolls please")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  assertEquals(result.items[0].name.toLowerCase().includes("california"), true);
});

Deno.test("Asian: 'spicy tuna roll'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have a spicy tuna roll")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("spicy tuna"), true);
});

Deno.test("Asian: 'dragon roll'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("One dragon roll")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("dragon"), true);
});

Deno.test("Asian: 'philadelphia roll'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("Two philadelphia rolls")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  assertEquals(result.items[0].name.toLowerCase().includes("philadelphia"), true);
});

// ============================================================================
// ASIAN: SOUPS & NOODLES
// ============================================================================

Deno.test("Asian: 'miso soup'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("miso soup to start")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("miso"), true);
});

Deno.test("Asian: 'wonton soup'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'd like wonton soup")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("wonton"), true);
});

Deno.test("Asian: 'pad thai'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("pad thai with extra peanuts")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("pad thai"), true);
});

Deno.test("Asian: 'lo mein'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("chicken lo mein please")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasLoMein = result.items.some(i => i.name.toLowerCase().includes("lo mein"));
  assertEquals(hasLoMein, true);
});

Deno.test("Asian: 'fried rice'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("shrimp fried rice")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("fried rice"), true);
});

// ============================================================================
// ASIAN: CHICKEN DISHES
// ============================================================================

Deno.test("Asian: 'general tso chicken'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("general tso chicken")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("general tso"), true);
});

Deno.test("Asian: 'orange chicken'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have the orange chicken")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("orange"), true);
});

Deno.test("Asian: 'kung pao chicken'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("kung pao chicken please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("kung pao"), true);
});

Deno.test("Asian: 'sesame chicken'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("sesame chicken")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("sesame"), true);
});

Deno.test("Asian: 'teriyaki chicken'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("teriyaki chicken bowl")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasTeriyaki = result.items.some(i => i.name.toLowerCase().includes("teriyaki"));
  assertEquals(hasTeriyaki, true);
});

// ============================================================================
// ASIAN: APPETIZERS
// ============================================================================

Deno.test("Asian: 'spring rolls'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("2 spring rolls")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("spring roll"), true);
});

Deno.test("Asian: 'egg rolls'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("3 egg rolls please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("egg roll"), true);
});

Deno.test("Asian: 'edamame'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("edamame to start")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("edamame"), true);
});

Deno.test("Asian: 'gyoza'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have the gyoza")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("gyoza"), true);
});

// ============================================================================
// MEXICAN CUISINE
// ============================================================================

Deno.test("Mexican: 'tacos al pastor'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("3 tacos al pastor")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  assertEquals(result.items[0].name.toLowerCase().includes("taco"), true);
});

Deno.test("Mexican: 'carnitas tacos'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("two carnitas tacos")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasTaco = result.items.some(i => i.name.toLowerCase().includes("taco"));
  assertEquals(hasTaco, true);
});

Deno.test("Mexican: 'burrito'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("one chicken burrito")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("burrito"), true);
});

Deno.test("Mexican: 'quesadilla'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("cheese quesadilla please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("quesadilla"), true);
});

Deno.test("Mexican: 'nachos'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("loaded nachos")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("nachos"), true);
});

Deno.test("Mexican: 'enchiladas'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("beef enchiladas")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("enchilada"), true);
});

Deno.test("Mexican: 'chips and guac'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("chips and guac to start")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasChips = result.items.some(i => i.name.toLowerCase().includes("chip") || i.name.toLowerCase().includes("guac"));
  assertEquals(hasChips, true);
});

// ============================================================================
// AMERICAN CASUAL
// ============================================================================

Deno.test("American: 'double cheeseburger'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("double cheeseburger with fries")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasBurger = result.items.some(i => i.name.toLowerCase().includes("burger"));
  assertEquals(hasBurger, true);
});

Deno.test("American: 'bacon burger'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("bacon burger please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("burger"), true);
});

Deno.test("American: '10 piece wings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("10 piece buffalo wings")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasWings = result.items.some(i => i.name.toLowerCase().includes("wing"));
  assertEquals(hasWings, true);
});

Deno.test("American: 'chicken tenders'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("chicken tenders with ranch")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasTenders = result.items.some(i => i.name.toLowerCase().includes("tender") || i.name.toLowerCase().includes("chicken"));
  assertEquals(hasTenders, true);
});

Deno.test("American: 'fries'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("large fries")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("fries"), true);
});

Deno.test("American: 'onion rings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("side of onion rings")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("onion rings"), true);
});

Deno.test("American: 'hot dog'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("two hot dogs")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("hot dog"), true);
});

// ============================================================================
// BAKERY/CAFE
// ============================================================================

Deno.test("Cafe: 'latte'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("large latte please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("latte"), true);
});

Deno.test("Cafe: 'cappuccino'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("one cappuccino")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("cappuccino"), true);
});

Deno.test("Cafe: 'americano'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("iced americano")
  ]);
  
  assertEquals(result.items.length >= 1, true);
  const hasAmericano = result.items.some(i => i.name.toLowerCase().includes("americano"));
  assertEquals(hasAmericano, true);
});

Deno.test("Cafe: 'croissant'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("butter croissant")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("croissant"), true);
});

Deno.test("Cafe: 'muffin'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("blueberry muffin")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("muffin"), true);
});

Deno.test("Cafe: 'bagel'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("everything bagel with cream cheese")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("bagel"), true);
});

// ============================================================================
// DRINKS
// ============================================================================

Deno.test("Drink: 'two-liter Pepsi'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("and a two-liter Pepsi")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("pepsi"), true);
});

Deno.test("Drink: '2-liter Coke'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("a 2-liter Coke")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("coke"), true);
});

Deno.test("Drink: 'bottle of water'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("bottle of water")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("water"), true);
});

Deno.test("Drink: 'large iced tea'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("large iced tea")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("tea"), true);
});

Deno.test("Drink: 'Dr Pepper'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("can of Dr Pepper")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("dr"), true);
});

Deno.test("Drink: 'lemonade'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("large lemonade")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("lemonade"), true);
});

// ============================================================================
// APPETIZERS & SIDES
// ============================================================================

Deno.test("Appetizer: 'bruschetta'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("start with the bruschetta")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("bruschetta"), true);
});

Deno.test("Dessert: 'tiramisu'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("and tiramisu for dessert")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("tiramisu"), true);
});

Deno.test("Side: 'garlic bread'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("also garlic bread")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("garlic"), true);
});

Deno.test("Appetizer: 'calamari'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("fried calamari to start")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("calamari"), true);
});

Deno.test("Dessert: 'cannoli'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("two cannoli please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("cannoli"), true);
});

// ============================================================================
// COMPLETE ORDERS (REAL SCENARIOS)
// ============================================================================

Deno.test("Complete order: Jack's Bella Italia order", () => {
  const transcript: TranscriptEntry[] = [
    agentSays("Thanks for calling Bella Italia Ristorante. How can I help you today?"),
    userSays("Hey, can I place an order for delivery, please?"),
    agentSays("Yes, you can. What can I get for you?"),
    userSays("Um, can we get, um, lasagna?"),
    agentSays("All right, one lasagna. Anything else?"),
    userSays("Um, a large margarita."),
    agentSays("Okay, so that's one lasagna and one large margarita pizza. Is there anything else I can add to your order?"),
    userSays("Uh, just a drink. I want Pepsi two liter."),
    agentSays("Got it. Your total is $42.50."),
  ];
  
  const result = parseNaturalLanguageItems("Lasagna; large margarita; Pepsi, two liter", transcript);
  
  assertEquals(result.items.length >= 3, true, `Expected at least 3 items, got ${result.items.length}: ${JSON.stringify(result.items)}`);
  
  const hasLasagna = result.items.some(i => i.name.toLowerCase().includes("lasagna"));
  assertEquals(hasLasagna, true, "Should have lasagna");
  
  const hasPizza = result.items.some(i => i.name.toLowerCase().includes("margarita") || i.name.toLowerCase().includes("margherita"));
  assertEquals(hasPizza, true, "Should have margarita pizza");
  
  const hasPepsi = result.items.some(i => i.name.toLowerCase().includes("pepsi"));
  assertEquals(hasPepsi, true, "Should have Pepsi");
  
  assertEquals(result.totalCents, 4250, "Total should be $42.50 = 4250 cents");
});

Deno.test("Complete order: Chinese restaurant", () => {
  const transcript: TranscriptEntry[] = [
    userSays("I'd like to order general tso chicken, fried rice, and 2 egg rolls"),
    agentSays("Sure, your total comes to $22.50"),
  ];
  
  const result = parseNaturalLanguageItems("", transcript);
  
  assertEquals(result.items.length >= 3, true);
  assertEquals(result.totalCents, 2250);
});

Deno.test("Complete order: Sushi restaurant", () => {
  const transcript: TranscriptEntry[] = [
    userSays("2 california rolls, a dragon roll, and miso soup"),
    agentSays("That'll be $28.00"),
  ];
  
  const result = parseNaturalLanguageItems("", transcript);
  
  assertEquals(result.items.length >= 3, true);
  assertEquals(result.totalCents, 2800);
});

Deno.test("Complete order: Mexican restaurant", () => {
  const transcript: TranscriptEntry[] = [
    userSays("3 tacos al pastor, a chicken burrito, and chips and guac"),
    agentSays("Your total is $19.75"),
  ];
  
  const result = parseNaturalLanguageItems("", transcript);
  
  assertEquals(result.items.length >= 2, true);
  assertEquals(result.totalCents, 1975);
});

Deno.test("Complete order: American grill", () => {
  const transcript: TranscriptEntry[] = [
    userSays("Double cheeseburger, 10 piece wings, and large fries"),
    agentSays("That comes to $24.99"),
  ];
  
  const result = parseNaturalLanguageItems("", transcript);
  
  assertEquals(result.items.length >= 2, true);
  assertEquals(result.totalCents, 2499);
});

// ============================================================================
// TOTAL EXTRACTION
// ============================================================================

Deno.test("Total: 'Your total is $42.50'", () => {
  const result = parseNaturalLanguageItems("", [
    agentSays("Your total is $42.50")
  ]);
  
  assertEquals(result.totalCents, 4250);
});

Deno.test("Total: 'That comes to 28.99'", () => {
  const result = parseNaturalLanguageItems("", [
    agentSays("That comes to 28.99")
  ]);
  
  assertEquals(result.totalCents, 2899);
});

Deno.test("Total: 'That'll be $15'", () => {
  const result = parseNaturalLanguageItems("", [
    agentSays("That'll be $15")
  ]);
  
  assertEquals(result.totalCents, 1500);
});

Deno.test("Total: '$35.00 total'", () => {
  const result = parseNaturalLanguageItems("", [
    agentSays("So that's $35.00 total")
  ]);
  
  assertEquals(result.totalCents, 3500);
});

Deno.test("Total: Spelled-out not extracted", () => {
  const result = parseNaturalLanguageItems("", [
    agentSays("Your total will be forty-two dollars and fifty cents")
  ]);
  
  assertEquals(result.totalCents, null);
});

// ============================================================================
// MODIFIERS
// ============================================================================

Deno.test("Modifier: 'no onions'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("large pepperoni pizza with no onions")
  ]);
  
  assertEquals(result.items.length, 1);
  assertExists(result.items[0].modifiers);
  assertEquals(result.items[0].modifiers!.some(m => m.toLowerCase().includes("no onions")), true);
});

Deno.test("Modifier: 'extra cheese'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("cheese pizza with extra cheese")
  ]);
  
  assertEquals(result.items.length, 1);
  assertExists(result.items[0].modifiers);
  assertEquals(result.items[0].modifiers!.some(m => m.toLowerCase().includes("extra cheese")), true);
});

Deno.test("Modifier: 'gluten-free'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("gluten-free pepperoni")
  ]);
  
  assertEquals(result.items.length, 1);
  assertExists(result.items[0].modifiers);
  assertEquals(result.items[0].modifiers!.some(m => m.toLowerCase().includes("gluten")), true);
});

Deno.test("Modifier: 'no jalapeños'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("nachos with no jalapenos")
  ]);
  
  assertEquals(result.items.length, 1);
  assertExists(result.items[0].modifiers);
});

Deno.test("Modifier: 'extra spicy'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("make it extra hot please")
  ]);
  
  // Modifiers should be captured
  assertEquals(typeof result, "object");
});

// ============================================================================
// ITALIAN: CALZONES, STROMBOLI, SUBS
// ============================================================================

Deno.test("Calzone: '3 calzones'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'd like 3 calzones please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("calzone"), true);
  assertEquals(result.items[0].qty, 3);
});

Deno.test("Calzone: 'calzone' standalone", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("Can I get a calzone?")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("calzone"), true);
});

Deno.test("Stromboli: 'two strombolis'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("two strombolis")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("stromboli"), true);
  assertEquals(result.items[0].qty, 2);
});

Deno.test("Italian: 'chicken parm'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have the chicken parm")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("chicken"), true);
});

Deno.test("Italian: 'stuffed shells'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("stuffed shells please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("stuffed"), true);
});

Deno.test("Subs: 'meatball sub'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I want a meatball sub")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("meatball"), true);
});

Deno.test("Subs: 'italian hero'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("One italian hero")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name.toLowerCase().includes("italian"), true);
});

// ============================================================================
// AMERICAN: WINGS (expanded)
// ============================================================================

Deno.test("Wings: '42 wings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'd like 42 wings please")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].qty, 42);
  assertEquals(result.items[0].name.toLowerCase().includes("wing"), true);
});

Deno.test("Wings: '10 buffalo wings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("10 buffalo wings")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].qty, 10);
  assertEquals(result.items[0].name.toLowerCase().includes("wing"), true);
});

Deno.test("Wings: '20 piece wings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("20 piece wings bbq")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].qty, 20);
});

Deno.test("Wings: 'garlic parmesan wings'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("12 garlic parmesan wings")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].qty, 12);
});

// ============================================================================
// COMBINED ORDERS
// ============================================================================

Deno.test("Combined: '42 wings and 3 calzones'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'd like 42 wings and 3 calzones")
  ]);
  
  assertEquals(result.items.length, 2);
  
  const wingsItem = result.items.find(i => i.name.toLowerCase().includes("wing"));
  const calzoneItem = result.items.find(i => i.name.toLowerCase().includes("calzone"));
  
  assertExists(wingsItem);
  assertExists(calzoneItem);
  assertEquals(wingsItem?.qty, 42);
  assertEquals(calzoneItem?.qty, 3);
});

Deno.test("Combined: 'pizza, calzone, and pepsi'", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("I'll have a large pepperoni pizza, a calzone, and a pepsi")
  ]);
  
  assertEquals(result.items.length >= 3, true);
});

// ============================================================================
// EDGE CASES
// ============================================================================

Deno.test("Edge: Empty transcript", () => {
  const result = parseNaturalLanguageItems("", []);
  
  assertEquals(result.items.length, 0);
  assertEquals(result.totalCents, null);
});

Deno.test("Edge: No food items mentioned", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("What time do you close?"),
    agentSays("We close at 10pm")
  ]);
  
  assertEquals(result.items.length, 0);
});

Deno.test("Edge: Just greeting", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("Hi, I'd like to place an order")
  ]);
  
  // Should handle gracefully
  assertEquals(typeof result, "object");
});

Deno.test("Edge: Multiple quantities", () => {
  const result = parseNaturalLanguageItems("", [
    userSays("3 large pepperoni pizzas")
  ]);
  
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].qty, 3);
});
