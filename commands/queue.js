const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current music queue'),

    async execute(interaction) {
        const serverQueue = queue.get(interaction.guild.id);

        if (!serverQueue || serverQueue.songs.length === 0) {
            return interaction.reply({ content: 'The queue is currently empty.', ephemeral: true });
        }

        // Format the array of songs into a readable list
        let queueString = '';
        for (let i = 0; i < serverQueue.songs.length; i++) {
            if (i === 0) {
                queueString += `**Now Playing:** ${serverQueue.songs[i].title}\n\n**Up Next:**\n`;
            } else {
                queueString += `**${i}.** ${serverQueue.songs[i].title}\n`;
            }

            // Limit to 10 songs so the Discord message doesn't get too long
            if (i === 10) {
                queueString += `\n*...and ${serverQueue.songs.length - 11} more songs*`;
                break;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🎶 Server Music Queue')
            .setDescription(queueString)
            .setColor('#A020F0');

        await interaction.reply({ embeds: [embed] });
    },
};