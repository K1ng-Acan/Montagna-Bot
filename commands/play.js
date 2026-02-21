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

            // --- THE FINAL BYPASS SETTINGS ---
            const dlOptions = {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                format: 'bestaudio/best',
                // 1. Force IPv4: Datacenter IPv6 addresses are flagged as bots by default.
                forceIpv4: true, 
                // 2. Clear Cache: Deletes any previously blocked session data
                rmCacheDir: true,
                // 3. Client Spoofing: Try mobile clients first, fallback to web
                extractorArgs: 'youtube:player_client=ios,android,web'
            };

            // Fetch data
            const videoInfo = await youtubedl(url, dlOptions);

            if (!videoInfo || !videoInfo.url) {
                return interaction.editReply('Failed to extract audio stream from that URL.');
            }

            // Create Player
            const resource = createAudioResource(videoInfo.url, { 
                inputType: StreamType.Arbitrary,
                inlineVolume: true 
            });

            const player = createAudioPlayer();
            player.play(resource);

            // Connect
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

            // Cleanup
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
                errorMessage = 'YouTube blocked the connection. Try again, or try a different video.';
            } else if (error.message.includes('not a valid URL')) {
                errorMessage = 'Please provide a valid YouTube URL.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};