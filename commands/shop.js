const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { items } = require('../shop-items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays all items available for purchase.'),
    async execute(interaction) {
        const itemsArray = Array.from(items.values());

        const embed = new EmbedBuilder()
            .setTitle('Welcome to the Shop!')
            .setColor(0x5865F2)
            .setDescription('Here are the items available for purchase. Use `/buy <item>` to get one!');

        itemsArray.forEach(item => {
            embed.addFields({
                name: `${item.name} - ${item.price.toLocaleString()} Coins 💰`,
                value: item.description,
            });
        });

        await interaction.reply({ embeds: [embed] });
    },
};