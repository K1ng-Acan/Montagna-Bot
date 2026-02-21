const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
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

            // --- THE MAGIC FIX IS HERE ---
            // We tell yt-dlp to use iOS and Android TV API clients instead of the Web client.
            // This bypasses the "Sign in to confirm you're not a bot" IP block.
            const videoInfo = await youtubedl(url, {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                format: 'bestaudio/best',
                extractorArgs: 'youtube:player_client=ios,android,tv' 
            });

            if (!videoInfo || !videoInfo.url) {
                return interaction.editReply('Failed to extract audio stream from that URL.');
            }

            const resource = createAudioResource(videoInfo.url, { 
                inputType: StreamType.Arbitrary,
                inlineVolume: true 
            });

            const player = createAudioPlayer();
            player.play(resource);

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
                errorMessage = 'YouTube blocked the server IP. Trying a different song might work.';
            } else if (error.message.includes('not a valid URL')) {
                errorMessage = 'Please provide a valid YouTube URL.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};