const { Events } = require('discord.js');
const guildRegistry = require('../guild-registry');

module.exports = {
    name:Events.GuildDelete,
    execute(channel){
        guildRegistry.clearChannel(channel.id);
    }
}