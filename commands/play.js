const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube.')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL of the YouTube video')
                .setRequired(true)),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to be in a voice channel to play music!', ephemeral: true });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({ content: 'I need permissions to join and speak in your voice channel!', ephemeral: true });
        }

        await interaction.deferReply();

        const url = interaction.options.getString('url');

        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            player.play(resource);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            connection.subscribe(player);

            // Store the player and connection in our queue
            const serverQueue = {
                connection: connection,
                player: player,
            };
            queue.set(interaction.guild.id, serverQueue);

            player.on(AudioPlayerStatus.Idle, () => {
                queue.delete(interaction.guild.id); // Clean up when done
                connection.destroy();
            });

            const videoInfo = await ytdl.getInfo(url);
            await interaction.editReply(`Now playing: **${videoInfo.videoDetails.title}** 🎶`);

        } catch (error) {
            console.error(error);
            await interaction.editReply('Could not play the video. Make sure it is a valid YouTube URL.');
        }
    },
};