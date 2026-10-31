const { Events } = require('discord.js');
const guildRegistry = require('../guild-registry');

module.exports = {
    name:Events.GuildDelete,
    execute(guild){
        guildRegistry.removeGuild(guild.id);
    }
}