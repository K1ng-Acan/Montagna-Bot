const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAccount, updateBalance, updateCooldown } = require('../utils/economy-utils');
const ms = require('ms'); // You might need to install this: npm install ms

const DAILY_REWARD = 500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Claim your daily reward of ${DAILY_REWARD} coins!`),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const account = await getAccount(userId, guildId);

        const lastDaily = account.lastDaily ? account.lastDaily.toDate() : null;
        const timeSinceLastDaily = lastDaily ? Date.now() - lastDaily.getTime() : Infinity;

        if (timeSinceLastDaily < DAILY_COOLDOWN) {
            const timeLeft = DAILY_COOLDOWN - timeSinceLastDaily;
            return interaction.editReply(`You have already claimed your daily reward. Please wait **${ms(timeLeft, { long: true })}**.`);
        }

        // Update balance and cooldown
        await updateBalance(userId, guildId, DAILY_REWARD);
        await updateCooldown(userId, guildId, 'daily');

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Daily Reward Claimed!')
            .setDescription(`You have received **${DAILY_REWARD}** coins! 🪙`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};