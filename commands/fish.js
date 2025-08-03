const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAccount, updateBalance, updateCooldown } = require('../utils/economy-utils');
const { getRandomCatch } = require('../fishing-loot');
const ms = require('ms');

const FISHING_COOLDOWN = 5 * 60 * 1000; // 5 minutes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing to catch fish and find treasure!'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const account = await getAccount(userId, guildId);

        // 1. Requirement Check: Does the user have a fishing rod?
        if (!account.inventory || !account.inventory.includes('fishing_rod')) {
            return interaction.editReply('You need a `Sturdy Fishing Rod` to go fishing! Buy one from the `/shop`.');
        }

        // 2. Cooldown Check
        const lastFish = account.lastFish ? account.lastFish.toDate() : null;
        const timeSinceLastFish = lastFish ? Date.now() - lastFish.getTime() : Infinity;

        if (timeSinceLastFish < FISHING_COOLDOWN) {
            const timeLeft = FISHING_COOLDOWN - timeSinceLastFish;
            return interaction.editReply(`You're fishing too quickly! You can fish again in **${ms(timeLeft, { long: true })}**.`);
        }

        // 3. Go Fishing!
        const caughtItem = getRandomCatch();
        await updateBalance(userId, guildId, caughtItem.value);
        await updateCooldown(userId, guildId, 'fish');

        // 4. Send Reply
        const embed = new EmbedBuilder()
            .setColor(0x3498DB) // A watery blue
            .setTitle('You went fishing...')
            .setDescription(`You cast your line and caught **${caughtItem.name}**!\nIt's worth **${caughtItem.value.toLocaleString()}** coins. 🎣`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};