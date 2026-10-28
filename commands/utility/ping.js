const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    cooldown: 5, 
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong! (and the time it took to answer)'),
    async execute(interaction) {
        const response = await interaction.reply({ content: 'Pinging...', flags: MessageFlags.Ephemeral, withResponse: true });
        const latency = response.resource.message.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! Latency: \`${latency}ms\``);
    },
};