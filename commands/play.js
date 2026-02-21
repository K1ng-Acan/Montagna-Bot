const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { queue } = require('../queue.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song (Powered by SoundCloud)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The name of the song or a SoundCloud URL')
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
            const query = interaction.options.getString('query');
            let trackInfo;

            // 1. If it's a YouTube link, reject it nicely
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                return interaction.editReply('❌ YouTube links are currently blocked by Google. Please type the **name of the song** instead (e.g., `/play shape of you`).');
            }

            // 2. Search SoundCloud
            if (query.includes('soundcloud.com')) {
                // It's a direct SoundCloud link
                trackInfo = await play.soundcloud(query);
            } else {
                // It's a text search (e.g., "Avicii Wake Me Up")
                const searchResults = await play.search(query, {
                    limit: 1,
                    source: { soundcloud: 'tracks' }
                });

                if (!searchResults || searchResults.length === 0) {
                    return interaction.editReply('Could not find that song on SoundCloud. Try being more specific!');
                }
                trackInfo = searchResults[0];
            }

            // 3. Create Audio Stream
            const stream = await play.stream(trackInfo.url);
            const resource = createAudioResource(stream.stream, { 
                inputType: stream.type,
                inlineVolume: true 
            });

            const player = createAudioPlayer();
            player.play(resource);

            // 4. Connect to Voice Channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);

            // 5. Store in Queue
            const serverQueue = {
                connection,
                player,
                url: trackInfo.url,
                voiceChannel
            };
            queue.set(interaction.guild.id, serverQueue);

            await interaction.editReply(`Now playing: **${trackInfo.name}** 🎶`);

            // 6. Cleanup when finished
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
            console.error('SoundCloud play error:', error);
            await interaction.editReply('Failed to play the track. Something went wrong.');
        }
    },
};