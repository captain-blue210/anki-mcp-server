#!/usr/bin/env node

/**
 * Direct test script for the random selection functionality.
 */

// Function to randomly select card IDs (same as implemented in the server)
function getRandomCardIds(cardIds, count) {
  if (count >= cardIds.length) {
    return cardIds;
  }

  const shuffled = [...cardIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// Test with a mock array of card IDs
function testRandomSelection() {
  // Create a mock array of 300 card IDs (similar to your real data)
  const mockCardIds = Array.from({ length: 300 }, (_, i) => 1000000 + i);

  console.log(`Total number of mock card IDs: ${mockCardIds.length}`);

  // Test with count=10
  const randomCardIds10 = getRandomCardIds(mockCardIds, 10);
  console.log(`\nSelected ${randomCardIds10.length} random cards (count=10):`);
  console.log(randomCardIds10);

  // Test with count=5
  const randomCardIds5 = getRandomCardIds(mockCardIds, 5);
  console.log(`\nSelected ${randomCardIds5.length} random cards (count=5):`);
  console.log(randomCardIds5);

  // Test with count greater than available cards
  const randomCardIds500 = getRandomCardIds(mockCardIds, 500);
  console.log(
    `\nSelected ${randomCardIds500.length} random cards (count=500):`
  );
  console.log(`(Returns all cards since count > available cards)`);

  // Verify randomness by running multiple selections
  console.log("\nVerifying randomness with multiple selections (count=10):");
  const selections = [];

  for (let i = 0; i < 5; i++) {
    selections.push(getRandomCardIds(mockCardIds, 10));
  }

  // Check if selections are different (a simple way to verify randomness)
  let allSame = true;
  for (let i = 1; i < selections.length; i++) {
    if (!arraysEqual(selections[0], selections[i])) {
      allSame = false;
      break;
    }
  }

  console.log(
    allSame
      ? "All selections returned the same results (not random)"
      : "Different selections returned different results (randomness confirmed)"
  );

  console.log("\nTest completed successfully.");
}

// Helper function to check if arrays are equal
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Run the test
testRandomSelection();
