const { SlashCommandBuilder } = require('discord.js');
const { getAccount, updateBalance } = require('../utils/economy-utils');
const { items } = require('../shop-items');
const { doc, updateDoc, arrayUnion } = require('firebase/firestore');
const { db } = require('../firebase-config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The ID of the item you want to buy')
                .setRequired(true)
                .setAutocomplete(true)), // We'll add autocomplete for a great user experience!

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = Array.from(items.values())
            .filter(item => item.name.toLowerCase().startsWith(focusedValue.toLowerCase()))
            .map(item => ({ name: item.name, value: item.id }));

        await interaction.respond(choices.slice(0, 25)); // Respond with up to 25 choices
    },

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const itemId = interaction.options.getString('item');
        const itemToBuy = items.get(itemId);

        await interaction.deferReply({ ephemeral: true }); // Ephemeral reply so only the user sees it

        if (!itemToBuy) {
            return interaction.editReply('That item does not exist. Please check the item ID.');
        }

        const account = await getAccount(userId, guildId);

        if (account.balance < itemToBuy.price) {
            return interaction.editReply(`You don't have enough coins! You need **${itemToBuy.price.toLocaleString()}** but you only have **${account.balance.toLocaleString()}**.`);
        }

        if (account.inventory && account.inventory.includes(itemId)) {
            return interaction.editReply('You already own this item!');
        }

        // Process the purchase
        try {
            // 1. Subtract balance
            await updateBalance(userId, guildId, -itemToBuy.price);

            // 2. Add item to inventory using Firestore's arrayUnion
            const userDocRef = doc(db, 'economy', `${guildId}-${userId}`);
            await updateDoc(userDocRef, {
                inventory: arrayUnion(itemId)
            });

            // 3. [Advanced] Grant a role if the item specifies one
            if (itemToBuy.roleId) {
                const role = interaction.guild.roles.cache.get(itemToBuy.roleId);
                if (role && interaction.member.manageable) {
                    await interaction.member.roles.add(role);
                } else {
                    console.log(`Could not find or manage role with ID ${itemToBuy.roleId}`);
                }
            }

            await interaction.editReply(`🎉 You have successfully purchased the **${itemToBuy.name}**!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while processing your purchase.');
        }
    },
};