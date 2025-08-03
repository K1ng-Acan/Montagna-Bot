const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAccount } = require('../utils/economy-utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or another user's coin balance.")
        .addUserOption(option =>
            option.setName('user').setDescription('The user whose balance you want to see')),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        const account = await getAccount(targetUser.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`${targetUser.username}'s Balance`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: 'Coins 💰', value: `**${account.balance.toLocaleString()}**` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};