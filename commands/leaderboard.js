const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../firebase-config');
const { collection, query, where, getDocs } = require('firebase/firestore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top 10 richest users in the server.'),

    async execute(interaction) {
        await interaction.deferReply();

        const q = query(collection(db, 'economy'), where('guildId', '==', interaction.guild.id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return interaction.editReply('There are no users with a balance in this server yet!');
        }

        const users = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            users.push({ userId: data.userId, balance: data.balance });
        });

        // Sort users by balance in descending order
        users.sort((a, b) => b.balance - a.balance);

        // Get top 10
        const top10 = users.slice(0, 10);

        // Fetch user objects to get their names
        const leaderboardEntries = await Promise.all(
            top10.map(async (user, index) => {
                try {
                    const member = await interaction.guild.members.fetch(user.userId);
                    return `${index + 1}. **${member.user.username}**: ${user.balance.toLocaleString()} coins`;
                } catch (error) {
                    return `${index + 1}. *Unknown User*: ${user.balance.toLocaleString()} coins`;
                }
            })
        );

        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Gold color
            .setTitle(`🏆 Top 10 Richest Users in ${interaction.guild.name}`)
            .setDescription(leaderboardEntries.join('\n'))
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};