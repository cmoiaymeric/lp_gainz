const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const guildRegistry = require('../../guild-registry');

const riot = require('../../riot_api/summoner');

module.exports = {
    cooldown: 5,
    data : new SlashCommandBuilder().setName('list').setDescription('List all accounts tracked by the bot on this server'),

    async execute(interaction){
        if(guildRegistry.getGuild(interaction.guildId).accounts.length < 1){
            interaction.reply(`No accounts are currently being tracked on this server.\nTo add one use the command \`/register\`.`);
            return;
        }
        const accounts = guildRegistry.getTrackedAccounts();
        // Doesn't work yet...
        // Implement a multi-page display with components, buttons to switch views
    }
}