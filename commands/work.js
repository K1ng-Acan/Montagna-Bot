const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAccount, updateBalance, updateCooldown } = require('../utils/economy-utils');
const ms = require('ms');

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds
const MIN_WORK_REWARD = 50;
const MAX_WORK_REWARD = 250;
const workMessages = [
    "You worked as a programmer and fixed a critical bug.",
    "You flipped burgers at the local diner.",
    "You helped an old lady cross the street and she gave you some money.",
    "You mined some rare minerals in a cave.",
    "You delivered pizzas all over the city."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn some extra coins.'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const account = await getAccount(userId, guildId);

        const lastWork = account.lastWork ? account.lastWork.toDate() : null;
        const timeSinceLastWork = lastWork ? Date.now() - lastWork.getTime() : Infinity;

        if (timeSinceLastWork < WORK_COOLDOWN) {
            const timeLeft = WORK_COOLDOWN - timeSinceLastWork;
            return interaction.editReply(`You are tired. You can work again in **${ms(timeLeft, { long: true })}**.`);
        }

        const earnings = Math.floor(Math.random() * (MAX_WORK_REWARD - MIN_WORK_REWARD + 1)) + MIN_WORK_REWARD;
        const message = workMessages[Math.floor(Math.random() * workMessages.length)];

        // Update balance and cooldown
        await updateBalance(userId, guildId, earnings);
        await updateCooldown(userId, guildId, 'work');

        const embed = new EmbedBuilder()
            .setColor(0xFFFF00)
            .setTitle('You Worked Hard!')
            .setDescription(`${message}\nYou earned **${earnings}** coins! 💵`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};