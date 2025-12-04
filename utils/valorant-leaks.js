const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const parser = new Parser();

// GameRiv's Official Valorant Feed
const RSS_URL = 'https://gameriv.com/valorant/leaks-valorant/';

let lastArticleLink = null;

function getLeaksChannelId() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.leaksChannelId;
    } catch (err) {
        console.error('[CONFIG ERROR] Could not load config.json:', err.message);
        return null;
    }
}

async function checkLeaks(client) {
    try {
        const channelId = getLeaksChannelId();
        if (!channelId) return;

        // Fetch the feed
        const feed = await parser.parseURL(RSS_URL);
        if (!feed.items || feed.items.length === 0) return;

        // Get the newest article
        const latestPost = feed.items[0];

        // Check if it's new
        if (latestPost.link !== lastArticleLink) {

            // Initialization: prevent spam on restart
            if (lastArticleLink === null) {
                lastArticleLink = latestPost.link;
                return;
            }

            lastArticleLink = latestPost.link;

            const channel = await client.channels.fetch(channelId);
            if (!channel) return;

            // Build the Embed
            const embed = new EmbedBuilder()
                .setTitle(latestPost.title)
                .setURL(latestPost.link)
                .setDescription(`New article found on GameRiv!\n\n${latestPost.contentSnippet ? latestPost.contentSnippet.substring(0, 150) + '...' : ''}`)
                .setColor('#FF4655') // Valorant Red
                .setFooter({ text: 'Source: GameRiv' })
                .setTimestamp();

            await channel.send({ content: '🚨 **New Valorant Update/Leak!**', embeds: [embed] });
            console.log(`[GAMERIV] Sent: ${latestPost.title}`);
        }

    } catch (error) {
        console.error('[GAMERIV ERROR]', error.message);
    }
}

module.exports = { checkLeaks };