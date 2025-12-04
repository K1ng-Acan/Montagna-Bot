const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

const NEWS_API_URL = 'https://api.henrikdev.xyz/valorant/v1/website/en-us';
let lastNewsUrl = null;

function getNewsChannelId() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.newsChannelId;
    } catch (err) {
        console.error('[CONFIG ERROR] Could not load config.json:', err.message);
        return null;
    }
}

async function checkNews(client) {
    // 1. Load the ID securely from the .env file
    const channelId = getNewsChannelId();
    if (!channelId) {
        console.error('[NEWS] No NEWS_CHANNEL_ID found in .env');
        return;
    }

    try {
        const response = await axios.get(NEWS_API_URL);
        const articles = response.data.data;

        if (!articles || articles.length === 0) return;

        const latest = articles[0];

        if (latest.url !== lastNewsUrl) {
            if (lastNewsUrl === null) {
                lastNewsUrl = latest.url;
                return;
            }

            lastNewsUrl = latest.url;

            const channel = await client.channels.fetch(channelId);
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
                .setDescription('New official article posted.')
                .setColor('#FF4655') 
                .setTimestamp();

            await channel.send({ content: pingMsg, embeds: [embed] });
            console.log(`[NEWS] Posted: ${latest.title}`);
        }

    } catch (error) {
        console.error('[NEWS ERROR]', error.message);
    }
}

module.exports = { checkNews };