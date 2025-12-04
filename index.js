require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { checkNews } = require('./utils/valorant-news');
const { checkLeaks } = require('./utils/valorant-leaks');

// Create a new client instance
// You will need GuildMembers to grant roles and get member details.
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildVoiceStates
    ] 
});

// Keep-alive server for hosting (like on Replit)
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Client ready event
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  // --- VALORANT ALERTS SETUP ---
  console.log('Starting Valorant Alert Systems...');

  // 1. Run immediately on startup
  checkNews(client);
  checkLeaks(client);

  // 2. Schedule periodic checks (every 5 minutes = 300,000 ms)
  setInterval(() => {
      checkNews(client);
  }, 300000);

  setInterval(() => {
      checkLeaks(client);
  }, 300000);
});

// Handle ALL interactions (slash commands and autocomplete)
client.on(Events.InteractionCreate, async interaction => {

  // Handle Slash Command interactions
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  } 

  // Handle Autocomplete interactions
  else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      // Execute the autocomplete method from the command file
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
  }

});

// Log in to Discord
client.login(token);