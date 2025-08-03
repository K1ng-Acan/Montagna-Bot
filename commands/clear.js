const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Deletes a specified number of messages from the channel.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Required permission
        .setDMPermission(false),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply({ ephemeral: true });

        try {
            const fetched = await interaction.channel.messages.fetch({ limit: amount });
            const deletedMessages = await interaction.channel.bulkDelete(fetched, true);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00) // Green
                .setDescription(`✅ Successfully deleted **${deletedMessages.size}** messages.`);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            let errorMessage = 'An error occurred while trying to delete messages.';
            if (error.code === 50034) { // Error code for trying to delete messages older than 14 days
                errorMessage = 'I cannot delete messages that are older than 14 days.';
            }
            await interaction.editReply({ content: errorMessage });
        }
    },
};