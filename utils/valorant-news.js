const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// HenrikDev API Endpoint for English Website News
const NEWS_API_URL = 'https://api.henrikdev.xyz/valorant/v1/website/en-us';

let lastNewsUrl = null;

// Helper to safely read config.json
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
    const config = getConfig();

    // 1. Validate Config
    if (!config || !config.newsChannelId) {
        console.error('[NEWS] Missing newsChannelId in config.json');
        return;
    }
    if (!config.henrikApiKey) {
        console.error('[NEWS] Missing henrikApiKey in config.json (Required for Official News)');
        return;
    }

    try {
        // 2. Fetch News with API Key
        const response = await axios.get(NEWS_API_URL, {
            headers: {
                'Authorization': config.henrikApiKey,
                'User-Agent': 'DiscordBot/1.0', // Helps avoid 403/401 errors
            }
        });

        const articles = response.data.data;

        if (!articles || articles.length === 0) return;

        // Get the newest article
        const latest = articles[0];

        // 3. Check for new article
        if (latest.url !== lastNewsUrl) {

            // Initialization: prevent spam on bot restart
            if (lastNewsUrl === null) {
                lastNewsUrl = latest.url;
                return;
            }

            lastNewsUrl = latest.url;

            const channel = await client.channels.fetch(config.newsChannelId);
            if (!channel) return;

            // 4. Custom Pings based on title
            let pingMsg = '';
            const titleLower = latest.title.toLowerCase();

            if (titleLower.includes('patch notes')) {
                pingMsg = '@everyone **New Patch Notes!** 📝';
            } else if (titleLower.includes('night market')) {
                pingMsg = '@here **Night Market Announced!** 🌑';
            } else if (titleLower.includes('bundle') || titleLower.includes('skin')) {
                pingMsg = '**New Skin Bundle!** 🎨';
            }

            // 5. Build Embed
            const embed = new EmbedBuilder()
                .setTitle(latest.title)
                .setURL(latest.url)
                .setImage(latest.banner_url)
                .setDescription('New official article posted on playvalorant.com')
                .setColor('#FF4655') // Valorant Red
                .setFooter({ text: 'Source: Riot Games' })
                .setTimestamp();

            await channel.send({ content: pingMsg, embeds: [embed] });
            console.log(`[NEWS] Posted: ${latest.title}`);
        }

    } catch (error) {
        // Detailed error logging
        if (error.response) {
            console.error(`[NEWS ERROR] API responded with Status: ${error.response.status} ${error.response.statusText}`);
            if (error.response.status === 401) {
                console.error('[NEWS ERROR] Your API Key is invalid or missing. Check config.json');
            }
        } else {
            console.error('[NEWS ERROR]', error.message);
        }
    }
}

module.exports = { checkNews };