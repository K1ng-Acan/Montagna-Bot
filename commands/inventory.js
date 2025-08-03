const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAccount } = require('../utils/economy-utils');
const { items } = require('../shop-items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Check the items you own.'),

    async execute(interaction) {
        const account = await getAccount(interaction.user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Inventory`)
            .setColor(0xFFA500); // Orange color

        if (!account.inventory || account.inventory.length === 0) {
            embed.setDescription('You do not own any items yet. Visit the `/shop` to buy some!');
        } else {
            const inventoryList = account.inventory.map(itemId => {
                const item = items.get(itemId);
                return item ? `**${item.name}**\n*${item.description}*` : 'Unknown Item';
            }).join('\n\n');
            embed.setDescription(inventoryList);
        }

        await interaction.reply({ embeds: [embed] });
    },
};