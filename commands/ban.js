const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // Required permission
        .setDMPermission(false),

    async execute(interaction) {
        const member = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!member) {
            return interaction.reply({ content: 'Could not find that member.', ephemeral: true });
        }

        if (!member.bannable) {
            return interaction.reply({ content: 'I cannot ban this member. They may have a higher role than me or I lack permissions.', ephemeral: true });
        }

        try {
            await member.send(`You have been banned from **${interaction.guild.name}**. Reason: ${reason}`);
        } catch (dmError) {
            console.log(`Could not DM ${member.user.tag} before banning.`);
        }

        try {
            await member.ban({ reason: reason });

            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Red
                .setTitle('Member Banned')
                .addFields(
                    { name: 'Member', value: member.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while trying to ban the member.', ephemeral: true });
        }
    },
};