const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes the paused music.'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue) {
            return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });
        }

        const player = serverQueue.player;
        if (player.state.status === 'paused') {
            player.unpause();
            await interaction.reply('Music resumed. ▶️');
        } else {
            await interaction.reply({ content: 'The music is not paused.', ephemeral: true });
        }
    },
};