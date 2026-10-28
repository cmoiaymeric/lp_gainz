const { AttachmentBuilder, ContainerBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder().setName('info').setDescription('Sends a description about the bot.'),
    async execute(interaction){
        const thumbnailFile = new AttachmentBuilder(path.join(__dirname, '../../assets/img/worlds_image.jpg'), { name: 'worlds_image.jpg' });

        const exampleContainer = new ContainerBuilder()
        	.setAccentColor(0x0099ff)
        	.addSectionComponents((section) =>
        		section
        			.addTextDisplayComponents(
        				(textDisplay) => textDisplay.setContent(`# LP Gainz`),
        				(textDisplay) => textDisplay.setContent(`LP Gainz is a bot created to track you and your friend's LPs in League of Legends`),
        			)
        			.setThumbnailAccessory(
        				(thumbnail) => thumbnail.setDescription('Bot icon').setURL('attachment://worlds_image.jpg'),
        			),
        	)
        	.addSeparatorComponents((separator) => separator)
        	.addTextDisplayComponents(
                (textDisplay) => textDisplay.setContent(`-# LP Gainz is a work in progress and will receive updates.`),
            )
        
        await interaction.reply({
        	components: [exampleContainer],
        	files: [thumbnailFile],
        	flags: MessageFlags.IsComponentsV2,
        });
    }
}