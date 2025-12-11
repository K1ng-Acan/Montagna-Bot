const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const NEWS_API_URL = 'https://api.henrikdev.xyz/valorant/v1/website/en-us';
let lastNewsUrl = null;

function getConfig() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        console.error('[CONFIG ERROR] Could not load config.json:', err.message);
        return null;
    }
}

async function checkNews(client) {
    // LOGGER: Confirm the function was called
    console.log(`[NEWS] Checking for updates at ${new Date().toLocaleTimeString()}...`);

    const config = getConfig();

    if (!config || !config.newsChannelId) {
        console.error('[NEWS] Missing newsChannelId in config.json');
        return;
    }
    if (!config.henrikApiKey) {
        console.warn('[NEWS] Warning: No henrikApiKey found in config.json.');
    }

    try {
        const response = await axios.get(NEWS_API_URL, {
            headers: {
                'Authorization': config.henrikApiKey || '',
                'User-Agent': 'DiscordBot/1.0', 
            }
        });

        const articles = response.data.data;

        if (!articles || articles.length === 0) return;

        const latest = articles[0];

        if (latest.url !== lastNewsUrl) {
            if (lastNewsUrl === null) {
                lastNewsUrl = latest.url;
                console.log('[NEWS] Initialized. Waiting for new articles.');
                return;
            }

            lastNewsUrl = latest.url;

            const channel = await client.channels.fetch(config.newsChannelId);
            if (!channel) return;

            let pingMsg = '';
            const titleLower = latest.title.toLowerCase();

            if (titleLower.includes('patch notes')) {
                pingMsg = '@everyone **New Patch Notes!** 📝';
            } else if (titleLower.includes('night market')) {
                pingMsg = '@here **Night Market Announced!** 🌑';
            } else if (titleLower.includes('bundle') || titleLower.includes('skin')) {
                pingMsg = '**New Skin Bundle!** 🎨';
            }

            const embed = new EmbedBuilder()
                .setTitle(latest.title)
                .setURL(latest.url)
                .setImage(latest.banner_url)
                .setDescription('New official article posted on playvalorant.com')
                .setColor('#FF4655') 
                .setFooter({ text: 'Source: Riot Games' })
                .setTimestamp();

            await channel.send({ content: pingMsg, embeds: [embed] });
            console.log(`[NEWS] Sent: ${latest.title}`);
        } else {
            console.log('[NEWS] No new articles found.');
        }

    } catch (error) {
        if (error.response) {
            console.error(`[NEWS ERROR] Status: ${error.response.status} - ${error.response.statusText}`);
        } else {
            console.error('[NEWS ERROR]', error.message);
        }
    }
}

module.exports = { checkNews };