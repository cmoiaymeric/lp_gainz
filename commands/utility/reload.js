const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 10, 
    data: new SlashCommandBuilder().setName('reload').setDescription('Reloads bot slash commands')
    .addStringOption((option) => option.setName('command').setDescription('The command to reload').setRequired(true)),
    async execute(interaction) {
        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if(!command){
            return interaction.reply(`There is no command with name \`${commandName}\`!`);
        }

        // Look for the command file in every subfolder of commands/ (utility, moderation, ...)
        const foldersPath = path.join(__dirname, '..');
        const commandFolder = fs.readdirSync(foldersPath).find((folder) => fs.existsSync(path.join(foldersPath, folder, `${command.data.name}.js`)));

        if(!commandFolder){
            return interaction.reply(`Could not find the file for command \`${command.data.name}\`!`);
        }

        const filePath = path.join(foldersPath, commandFolder, `${command.data.name}.js`);
        delete require.cache[require.resolve(filePath)];

        try{
            const newCommand = require(filePath);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded`);
        }
        catch(error){
            console.error(error);
            await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
        }
    },
};