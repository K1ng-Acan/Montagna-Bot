const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the currently playing music.'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) {
            return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });
        }

        const player = serverQueue.player;
        if (player.state.status === 'playing') {
            player.pause();
            await interaction.reply('Music paused. ⏸️');
        } else {
            await interaction.reply({ content: 'The music is already paused.', ephemeral: true });
        }
    },
};