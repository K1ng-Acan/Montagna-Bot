const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const { queue } = require('../queue.js');

// Initialize play-dl (only once at startup)
async function initializePlayDl() {
    try {
        await play.setToken({
            youtube: {
                cookie: process.env.YOUTUBE_COOKIE // Optional but recommended
            }
        });
        console.log('play-dl initialized successfully');
    } catch (err) {
        console.error('play-dl initialization error:', err);
    }
}

// Call this when your bot starts
initializePlayDl();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The YouTube URL to play')
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

        try {
            const url = interaction.options.getString('url');

            // Get stream info
            let stream;
            try {
                stream = await play.stream(url);
            } catch (streamError) {
                console.error('Stream error:', streamError);
                // Try refreshing token if stream fails
                await play.refreshToken();
                stream = await play.stream(url);
            }

            // Create audio player and resource
            const player = createAudioPlayer();
            const resource = createAudioResource(stream.stream, { 
                inputType: stream.type,
                inlineVolume: true
            });
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
                if (queue.get(interaction.guild.id)) {
                    queue.delete(interaction.guild.id);
                    connection.destroy();
                }
            });

        } catch (error) {
            console.error('Play error:', error);
            let errorMessage = 'Failed to play the video.';

            if (error.message?.includes('Invalid URL')) {
                errorMessage = 'Please provide a valid YouTube URL.';
            } else if (error.message?.includes('age restricted')) {
                errorMessage = 'This video is age restricted. Try another video.';
            } else if (error.message?.includes('private') || error.message?.includes('unavailable')) {
                errorMessage = 'This video is private or unavailable.';
            } else if (error.message?.includes('not found')) {
                errorMessage = 'Video not found. Please check the URL.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};