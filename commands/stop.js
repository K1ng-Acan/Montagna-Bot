const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and leaves the channel.'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) {
            return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });
        }

        serverQueue.connection.destroy();
        queue.delete(interaction.guild.id);
        
        await interaction.reply('Music stopped and I have left the channel.');
    },
};