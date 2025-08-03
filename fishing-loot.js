// This array holds all possible catches.
// The 'chance' is a weight. Higher numbers are more common.
const lootTable = [
    { name: 'an Old Boot', type: 'junk', chance: 30, value: 1 },
    { name: 'a Rusty Can', type: 'junk', chance: 30, value: 1 },
    { name: 'a Common Carp', type: 'fish', chance: 25, value: 50 },
    { name: 'a Silver Salmon', type: 'fish', chance: 15, value: 150 },
    { name: 'a Golden Trout', type: 'rare', chance: 5, value: 500 },
    { name: 'a Sunken Treasure Chest', type: 'treasure', chance: 1, value: 2500 },
];

// This function calculates the total weight and picks a random item.
function getRandomCatch() {
    const totalChance = lootTable.reduce((sum, item) => sum + item.chance, 0);
    let randomValue = Math.random() * totalChance;

    for (const item of lootTable) {
        if (randomValue < item.chance) {
            return item;
        }
        randomValue -= item.chance;
    }
}

module.exports = { getRandomCatch };