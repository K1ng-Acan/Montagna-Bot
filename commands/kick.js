const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        // Add a user option for who to kick
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The member to kick')
                .setRequired(true)) // This option is mandatory
        // Add a string option for the reason
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for kicking the member'))
        // Set the default permission required to see this command
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        // Ensure this command cannot be used in DMs
        .setDMPermission(false),

    async execute(interaction) {
        // Get the options from the command interaction
        const memberToKick = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason') ?? 'No reason provided'; // '??' provides a default value if null

        // --- VALIDATION AND HIERARCHY CHECKS ---
        // Check if a member was actually found
        if (!memberToKick) {
            return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
        }

        // Check if the bot has permission to kick
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'I do not have permission to kick members.', ephemeral: true });
        }

        // Prevent kicking the server owner
        if (memberToKick.id === interaction.guild.ownerId) {
            return interaction.reply({ content: 'You cannot kick the server owner!', ephemeral: true });
        }

        // The `kickable` property checks if the bot's role is higher than the target member's role
        if (!memberToKick.kickable) {
            return interaction.reply({ content: 'I cannot kick this member. They may have a higher role than me or I lack permissions.', ephemeral: true });
        }

        // Prevent a user from kicking someone with an equal or higher role
        if (interaction.member.roles.highest.position <= memberToKick.roles.highest.position) {
            return interaction.reply({ content: 'You cannot kick a member with an equal or higher role than you.', ephemeral: true });
        }

        // --- ACTION ---
        await interaction.deferReply(); // Acknowledge the command immediately

        try {
            // Send a DM to the kicked member
            await memberToKick.send(`You have been kicked from **${interaction.guild.name}**. Reason: ${reason}`);
        } catch (error) {
            // This fails if the user has DMs disabled
            console.log(`Could not send a DM to ${memberToKick.user.tag}.`);
        }

        // Kick the member
        try {
            await memberToKick.kick(reason);
            // Edit the deferred reply to show the success message
            await interaction.editReply(`✅ **${memberToKick.user.tag}** has been kicked. Reason: ${reason}`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while trying to kick the member.');
        }
    },
};