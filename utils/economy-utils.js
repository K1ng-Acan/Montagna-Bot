const { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } = require('firebase/firestore');
const { db } = require('../firebase-config');

// A default structure for a new user account
const defaultAccount = {
    balance: 100,
    inventory: [], // Add this line
    lastDaily: null,
    lastWork: null,
};

/**
 * Gets a user's economy account from Firestore. If it doesn't exist, it creates one.
 * @param {string} userId - The Discord user ID.
 * @param {string} guildId - The Discord guild ID.
 * @returns {Promise<object>} The user's account data.
 */
async function getAccount(userId, guildId) {
    const userDocRef = doc(db, 'economy', `${guildId}-${userId}`);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        // If the document doesn't exist, create it with the new, correct structure
        const newAccountData = {
            balance: 100,
            inventory: [],
            lastDaily: null,
            lastWork: null,
            lastFish: null, // Add this line
            userId: userId,
            guildId: guildId,
        };
        await setDoc(userDocRef, newAccountData);
        return newAccountData;
    }
}

/**
 * Updates a user's balance.
 * @param {string} userId - The Discord user ID.
 * @param {string} guildId - The Discord guild ID.
 * @param {number} amount - The amount to add (can be negative to subtract).
 */
async function updateBalance(userId, guildId, amount) {
    const userDocRef = doc(db, 'economy', `${guildId}-${userId}`);
    const account = await getAccount(userId, guildId); // Ensure account exists
    const newBalance = account.balance + amount;
    await updateDoc(userDocRef, { balance: newBalance });
}

/**
 * Updates a command's cooldown timestamp for a user.
 * @param {string} userId - The Discord user ID.
 * @param {string} guildId - The Discord guild ID.
 * @param {'daily' | 'work'} commandName - The name of the command to update.
 */
async function updateCooldown(userId, guildId, commandName) {
    const userDocRef = doc(db, 'economy', `${guildId}-${userId}`);
    if (commandName === 'daily') {
        await updateDoc(userDocRef, { lastDaily: new Date() });
    } else if (commandName === 'work') {
        await updateDoc(userDocRef, { lastWork: new Date() });
    } else if (commandName === 'fish') { // Add this else if block
        await updateDoc(userDocRef, { lastFish: new Date() });
    }
}

module.exports = {
    getAccount,
    updateBalance,
    updateCooldown,
};