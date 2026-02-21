const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const { queue } = require('../queue.js');
const fs = require('fs');
const path = require('path');

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

            // 1. Cleaned up yt-dlp arguments
            const dlOptions = {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                format: 'bestaudio', // Ask for the best audio stream
                addHeader: ['referer:youtube.com'] 
            };

            // 2. Attach cookies to bypass the Cloud server IP block
            const cookiesPath = path.join(__dirname, '../cookies.txt');
            if (fs.existsSync(cookiesPath)) {
                dlOptions.cookies = cookiesPath;
            } else {
                console.warn('[MUSIC WARNING] No cookies.txt found! YouTube might block the request.');
            }

            // 3. Fetch data
            const videoInfo = await youtubedl(url, dlOptions);

            if (!videoInfo || !videoInfo.url) {
                return interaction.editReply('Failed to extract audio stream from that URL.');
            }

            // 4. Create Player
            const resource = createAudioResource(videoInfo.url, { 
                inputType: StreamType.Arbitrary,
                inlineVolume: true 
            });

            const player = createAudioPlayer();
            player.play(resource);

            // 5. Connect
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);

            const serverQueue = {
                connection,
                player,
                url,
                voiceChannel
            };
            queue.set(interaction.guild.id, serverQueue);

            await interaction.editReply(`Now playing: **${videoInfo.title}** 🎶`);

            // 6. Cleanup
            player.on(AudioPlayerStatus.Idle, () => {
                const currentQueue = queue.get(interaction.guild.id);
                if (currentQueue) {
                    queue.delete(interaction.guild.id);
                    if (currentQueue.connection && currentQueue.connection.state.status !== 'destroyed') {
                        currentQueue.connection.destroy();
                    }
                }
            });

            player.on('error', error => {
                console.error('Player Error:', error);
            });

        } catch (error) {
            console.error('yt-dlp error:', error.message);

            let errorMessage = 'Failed to play the video.';
            if (error.message.includes('Sign in') || error.message.includes('bot')) {
                errorMessage = 'YouTube blocked the server IP. Please make sure cookies.txt is valid and not expired.';
            } else if (error.message.includes('not a valid URL')) {
                errorMessage = 'Please provide a valid YouTube URL.';
            } else if (error.message.includes('Requested format is not available')) {
                errorMessage = 'YouTube did not provide a standard audio stream for this specific video.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};