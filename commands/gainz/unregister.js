const { SlashCommandBuilder, InteractionContextType, TextDisplayBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const guildRegistry = require('../../guild-registry');
const ACCENT_COLOR = 0x0099ff;

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName('unregister').setDescription('Stop tracking this account on the server.')
        .setContexts(InteractionContextType.Guild)
        .addStringOption((option) => option.setName('summoner_name').setDescription('The summoner name before the #').setRequired(true))
        .addStringOption((option) => option.setName('summoner_tag').setDescription('The #xxxxx after the summoner name').setRequired(true)),
    
    async execute(interaction){
        const gameName = interaction.options.getString('summoner_name', true);
        const tagLine = interaction.options.getString('summoner_tag', true);
        const guild = guildRegistry.getGuild(interaction.guildId);
        const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR);
        const textDisplay = new TextDisplayBuilder();

        await interaction.deferReply();

        const account = guild.accounts.find((tracked) =>
            tracked.gameName.toLowerCase() === gameName.toLowerCase() && tracked.tagLine.toLowerCase() === tagLine.toLowerCase());
        if (!account){
            textDisplay.setContent(`⚠️ \`${gameName}#${tagLine}\` isn't tracked on this server.`);
            container.addTextDisplayComponents(textDisplay);
            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        guildRegistry.removeAccount(interaction.guildId, account.puuid);

        textDisplay.setContent(`Not tracking \`${account.gameName}#${account.tagLine}\` on this server anymore.`);
        container.addTextDisplayComponents(textDisplay);
        return interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
}