const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The YouTube URL to play')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user is in voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to be in a voice channel to play music!', ephemeral: true });
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({ content: 'I need permissions to join and speak in your voice channel!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const url = interaction.options.getString('url');

            // Refresh token if needed
            if (play.is_expired()) {
                await play.refreshToken();
            }

            // Validate URL and get stream
            const validated = await play.validate(url);
            if (validated === 'search') {
                return interaction.editReply('Please provide a direct YouTube URL, not a search query.');
            }

            // Get stream info
            const { stream, type } = await play.stream(url);

            // Create audio player and resource
            const player = createAudioPlayer();
            const resource = createAudioResource(stream, { inputType: type });
            player.play(resource);

            // Join voice channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);

            // Store in queue
            const serverQueue = {
                connection,
                player,
                url,
                voiceChannel
            };
            queue.set(interaction.guild.id, serverQueue);

            // Get video info
            const info = await play.video_info(url);
            await interaction.editReply(`Now playing: **${info.video_details.title}** 🎶`);

            // Clean up when finished
            player.on('idle', () => {
                queue.delete(interaction.guild.id);
                connection.destroy();
            });

        } catch (error) {
            console.error('Play error:', error);
            let errorMessage = 'Failed to play the video.';

            if (error.message.includes('Invalid URL')) {
                errorMessage = 'Please provide a valid YouTube URL.';
            } else if (error.message.includes('age restricted')) {
                errorMessage = 'This video is age restricted and cannot be played.';
            } else if (error.message.includes('private')) {
                errorMessage = 'This video is private or unavailable.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};