const { Events } = require('discord.js');
const { loadEmojis } = require('../emojis');
const guildRegistry = require('../guild-registry');
const { startTracker } = require('../tracker');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready ! Logged in as ${client.user.tag}.`);
        await loadEmojis(client).catch((error) => console.error(`Could not load rank emojis`, error));

        for(const guildId of guildRegistry.getGuildIds()){
            if(!client.guilds.cache.has(guildId)) guildRegistry.removeGuild(guildId); 
        }

        startTracker(client);
    },
};