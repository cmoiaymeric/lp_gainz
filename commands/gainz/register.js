const { SlashCommandBuilder, InteractionContextType, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const guildRegistry = require('../../guild-registry');

const riot = require('../../riot_api/summoner');

const MAX_ACCOUNTS_PER_GUILD = 30;
const ACCENT_COLOR = 0x0099ff;

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
        const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);
        const textDisplay = new TextDisplayBuilder();

        if (guildRegistry.getGuild(interaction.guildId).accounts.length >= MAX_ACCOUNTS_PER_GUILD){
            textDisplay.setContent(`⚠️ This server already has \`${MAX_ACCOUNTS_PER_GUILD}\` accounts registered. It is the maximum amount for 1 server`);
            container.addTextDisplayComponents(textDisplay);
            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        await interaction.deferReply();

        const account = await riot.fetchAccount(gameName, tagLine);
        if(!account){
            textDisplay.setContent(`Couldn't find \`${gameName}#${tagLine}\`.`);
            container.addTextDisplayComponents(textDisplay);
            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const added = guildRegistry.addAccount(interaction.guildId, {
            puuid: account.puuid,
            gameName: account.gameName,
            tagLine: account.tagLine,
            region: region,
            addedBy: interaction.user.id,
        });
        if(added){
            textDisplay.setContent(`✅ Now tracking \`${account.gameName}#${account.tagLine}\` on this server.`);
            container.addTextDisplayComponents(textDisplay);
            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            })
        }
        textDisplay.setContent(`⚠️ \`${account.gameName}#${account.tagLine}\` is already tracked here.`);
        container.addTextDisplayComponents(textDisplay);
        return interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        })
    },
};