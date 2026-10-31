const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const guildRegistry = require('../../guild-registry');

const riot = require('../../riot_api/summoner');

const MAX_ACCOUNTS_PER_GUILD = 20;

module.exports = {
    cooldown: 5,
    data : new SlashCommandBuilder().setName('register').setDescription('Register an account to the bot.')
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

        if (guildRegistry.getGuild(interaction.guildId).accounts.length >= MAX_ACCOUNTS_PER_GUILD){
            return interaction.reply({content: `This server already has \`${MAX_ACCOUNTS_PER_GUILD}\` accounts registered. It is the maximum amount for 1 server`});
        }

        await interaction.deferReply();

        const account = await riot.getAccount(gameName, tagLine);
        if(!account){
            return interaction.editReply(`Couldn't find \`${gameName}#${tagLine}\`.`);
        }

        const added = guildRegistry.addAccount(interaction.guildId, {
            puuid: account.puuid,
            gameName: account.gameName,
            tagLine: account.tagLine,
            region: region,
            addedBy: interaction.user.id,
        });

        await interaction.editReply(added ? `Now tracking **${account.gameName}#${account.tagLine}** on this server.`
            : `**${account.gameName}#${account.tagLine}** is already tracked here.`);
    },
};