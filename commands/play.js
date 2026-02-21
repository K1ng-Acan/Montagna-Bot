const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { queue } = require('../queue.js');

// --- HELPER FUNCTION: Plays the next song in the queue ---
async function playNextSong(guildId, queueMap) {
    const serverQueue = queueMap.get(guildId);
    if (!serverQueue) return;

    // If there are no songs left, leave the channel
    if (serverQueue.songs.length === 0) {
        if (serverQueue.connection && serverQueue.connection.state.status !== 'destroyed') {
            serverQueue.connection.destroy();
        }
        queueMap.delete(guildId);
        return;
    }

    const song = serverQueue.songs[0]; // Get the first song in line

    try {
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { 
            inputType: stream.type,
            inlineVolume: true 
        });

        serverQueue.player.play(resource);

        // Announce the song in the chat (unless it's the very first song requested)
        if (!song.isFirst) {
            serverQueue.textChannel.send(`🎶 Now playing: **${song.title}**`);
        }

    } catch (error) {
        console.error('Error playing next song:', error);
        serverQueue.textChannel.send(`❌ Error playing **${song.title}**. Skipping to next...`);
        serverQueue.songs.shift(); // Remove broken song
        playNextSong(guildId, queueMap); // Try the next one
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song and add it to the queue')
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
            // Fix SoundCloud Client ID issue
            try {
                const clientID = await play.getFreeClientID();
                await play.setToken({ soundcloud: { client_id: clientID } });
            } catch (err) {
                console.error('Failed to fetch SoundCloud Client ID:', err.message);
            }

            const query = interaction.options.getString('query');
            let trackInfo;

            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                return interaction.editReply('❌ YouTube links are blocked. Please type the **name of the song** instead.');
            }

            if (query.includes('soundcloud.com')) {
                trackInfo = await play.soundcloud(query);
            } else {
                const searchResults = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
                if (!searchResults || searchResults.length === 0) {
                    return interaction.editReply('Could not find that song on SoundCloud.');
                }
                trackInfo = searchResults[0];
            }

            // --- QUEUE LOGIC STARTS HERE ---
            const song = {
                title: trackInfo.name,
                url: trackInfo.url,
                isFirst: false
            };

            let serverQueue = queue.get(interaction.guild.id);

            // If nothing is playing, create a new queue
            if (!serverQueue) {
                song.isFirst = true; // Mark as first so we don't double-announce it

                const queueConstruct = {
                    textChannel: interaction.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    player: createAudioPlayer(),
                    songs: [] // Here is our list of songs!
                };

                queue.set(interaction.guild.id, queueConstruct);
                queueConstruct.songs.push(song); // Add the first song

                try {
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: interaction.guild.id,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                    });
                    queueConstruct.connection = connection;
                    connection.subscribe(queueConstruct.player);

                    // When a song finishes, delete it from the list and play the next one!
                    queueConstruct.player.on(AudioPlayerStatus.Idle, () => {
                        queueConstruct.songs.shift(); // Remove the finished song
                        playNextSong(interaction.guild.id, queue); // Play next
                    });

                    queueConstruct.player.on('error', error => {
                        console.error('Player Error:', error);
                        queueConstruct.songs.shift();
                        playNextSong(interaction.guild.id, queue);
                    });

                    playNextSong(interaction.guild.id, queue);
                    await interaction.editReply(`🎶 Now playing: **${song.title}**`);

                } catch (err) {
                    console.error(err);
                    queue.delete(interaction.guild.id);
                    return interaction.editReply('There was an error connecting to the voice channel.');
                }
            } else {
                // If a song is already playing, just push this new song to the back of the line!
                serverQueue.songs.push(song);
                return interaction.editReply(`✅ Added to queue: **${song.title}** (Position: ${serverQueue.songs.length - 1})`);
            }

        } catch (error) {
            console.error('SoundCloud play error:', error);
            await interaction.editReply('Failed to play the track. Please try again.');
        }
    },
};