const { Events } = require('discord.js');
const { loadEmojis } = require('../emojis');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready ! Logged in as ${client.user.tag}.`);
        await loadEmojis(client).catch((error) => console.error(`Could not load rank emojis`, error));
    },
};