const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Times out a member for a specified duration.')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The member to time out')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the timeout (e.g., 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers) // Required permission
        .setDMPermission(false),

    async execute(interaction) {
        const member = interaction.options.getMember('member');
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        if (!member) {
            return interaction.reply({ content: 'Could not find that member.', ephemeral: true });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({ content: 'You cannot time yourself out.', ephemeral: true });
        }

        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'I cannot time myself out.', ephemeral: true });
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'I cannot time out an administrator.', ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'I cannot time out this member. They may have a higher role than me.', ephemeral: true });
        }

        const durationMs = ms(durationString);
        if (!durationMs || durationMs < 5000 || durationMs > 2.419e9) { // 5 seconds to 28 days
            return interaction.reply({ content: 'Please provide a valid duration between 5 seconds and 28 days.', ephemeral: true });
        }

        try {
            await member.timeout(durationMs, reason);

            const embed = new EmbedBuilder()
                .setColor(0xFF9900) // Orange
                .setTitle('Member Timed Out')
                .addFields(
                    { name: 'Member', value: member.user.tag, inline: true },
                    { name: 'Duration', value: durationString, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while trying to time out the member.', ephemeral: true });
        }
    },
};