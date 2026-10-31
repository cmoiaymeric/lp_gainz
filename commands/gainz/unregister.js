const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const guildRegistry = require('../../guild-registry');

const riot = require('../../riot_api/summoner');

const MAX_ACCOUNTS_PER_GUILD = 20;

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName('unregister').setDescription('Stop tracking this account on the server.')
        .setContexts(InteractionContextType.Guild)
        .addStringOption((option) => option.setName('summoner_name').setDescription('The summoner name before the #').setRequired(true))
        .addStringOption((option) => option.setName('summoner_tag').setDescription('The #xxxxx after the summoner name').setRequired(true))
        .addStringOption((option) => option.setName('region').setDescription('Account region')
            .addChoices(
					{ name: 'Europe/West', value: 'euw1' },
					{ name: 'North America', value: 'na1' },
					{ name: 'Oceania', value: 'oc1' },
                    { name: 'Korea', value: 'kr'},
                    { name: 'Vietnam', value: 'vn2'}
		    ).setRequired(true),
        ),
    
    async execute(interaction){
        const gameName = interaction.options.getString('summoner_name', true);
        const tagLine = interaction.options.getString('summoner_tag', true);
        const region = interaction.options.getString('region');

        await interaction.deferReply();

        const account = await riot.getAccount(gameName, tagLine);
        if(!account){
            return interaction.editReply(`Couldn't find \`${gameName}#${tagLine}\`.`);
        }

        const deleted = guildRegistry.removeAccount(interaction.guildId, account.puuid);

        await interaction.editReply(deleted ? `Not tracking **${account.gameName}#${account.tagLine}** on this server anymore.`
            : `**${account.gameName}#${account.tagLine}** isn't tracked on this server.`);
    },
}