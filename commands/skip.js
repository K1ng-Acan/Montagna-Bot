const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the currently playing song'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to skip!', ephemeral: true });
        }

        if (!serverQueue || !serverQueue.player) {
            return interaction.reply({ content: 'There is no song currently playing to skip!', ephemeral: true });
        }

        // Stopping the player triggers the "Idle" event in play.js, 
        // which automatically removes the song and plays the next one!
        serverQueue.player.stop();

        await interaction.reply('⏭️ Skipped the current song!');
    },
};