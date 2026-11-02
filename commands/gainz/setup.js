const path = require('node:path');
const {
    SlashCommandBuilder,
    InteractionContextType,
    PermissionFlagsBits,
    AttachmentBuilder,
    ContainerBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
} = require('discord.js');
const guildRegistry = require('../../guild-registry');

const ACCENT_COLOR = 0x0099ff;

const THUMBNAIL_PATH = path.join(__dirname, '../../assets/bot/worlds_image.jpg');
const THUMBNAIL_NAME = 'worlds_image.jpg';

const IDLE_TIMEOUT_MS = 3 * 60_000;
const MAX_LIFETIME_MS = 10 * 60_000;

// What the bot needs in the updates channel to post there
const REQUIRED_PERMISSIONS = [
    [PermissionFlagsBits.ViewChannel, 'View Channel'],
    [PermissionFlagsBits.SendMessages, 'Send Messages'],
];

// The saved updates channel, or null if none is set or it doesn't exist anymore
function getUpdatesChannel(guild) {
    const { channelId } = guildRegistry.getGuild(guild.id);
    return channelId ? guild.channels.cache.get(channelId) ?? null : null;
}

// Names of the permissions the bot is missing in this channel, empty if it has them all
function getMissingPermissions(channel) {
    const permissions = channel.permissionsFor(channel.guild.members.me);
    return REQUIRED_PERMISSIONS.filter(([flag]) => !permissions?.has(flag)).map(([, name]) => name);
}

// Builds the whole panel. Called again after every action, and once more when it closes.
// `notice` is a one-line feedback shown at the bottom ("Saved", "Test message sent"…)
function buildSetupPanel(guild, { notice = null, closed = false } = {}) {
    const channel = getUpdatesChannel(guild);
    const missing = channel ? getMissingPermissions(channel) : [];
    const { accounts } = guildRegistry.getGuild(guild.id);

    let channelStatus = `✅ ${channel}`;
    if (!channel) channelStatus = '❌ Not set: LP Gainz won\'t post anything on this server yet.';
    else if (missing.length) channelStatus = `⚠️ ${channel}, but I'm missing **${missing.join('**, **')}** there.`;

    const accountsStatus = accounts.length
        ? `${accounts.length} account${accounts.length === 1 ? '' : 's'} tracked. See them with \`/list\`, add more with \`/register\`.`
        : 'None yet. Add one with `/register`.';

    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR)
        .addSectionComponents((section) => section
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent(
                '# LP Gainz setup\n-# Choose the channel where LP Gainz posts rank updates and its other messages on this server.',
            ))
            .setThumbnailAccessory((thumbnail) => thumbnail.setDescription('Bot icon').setURL(`attachment://${THUMBNAIL_NAME}`)),
        )
        .addSeparatorComponents((separator) => separator)
        .addSectionComponents((section) => section
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### 📢 Updates channel\n${channelStatus}`))
            .setButtonAccessory((button) => button
                .setCustomId('setup:test')
                .setLabel('Send a test message')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(closed || !channel)),
        );

    if (!closed) {
        container.addActionRowComponents((row) => row.setComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('setup:channel')
                .setPlaceholder('Pick the updates channel')
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setDefaultChannels(channel ? [channel.id] : []), // the menu shows the saved channel
        ));
    }

    container
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### 👥 Tracked accounts\n${accountsStatus}`));

    if (!closed) {
        container
            .addSeparatorComponents((separator) => separator)
            .addActionRowComponents((row) => row.setComponents(
                new ButtonBuilder().setCustomId('setup:disable').setLabel('Turn off updates').setStyle(ButtonStyle.Danger)
                    .setDisabled(!channel),
                new ButtonBuilder().setCustomId('setup:done').setLabel('Done').setStyle(ButtonStyle.Success),
            ));
    }

    if (notice) {
        container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`-# ${notice}`));
    }
    if (closed) {
        container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('-# This panel is closed. Run `/setup` again to change the settings.'));
    }

    return {
        components: [container],
        // Attached again with every edit of the panel (it's 28 KB): discord.js then replaces the previous copy,
        // so the thumbnail always points to a file that is really on the message
        files: [new AttachmentBuilder(THUMBNAIL_PATH, { name: THUMBNAIL_NAME })],
        flags: MessageFlags.IsComponentsV2,
    };
}

// Posted in the updates channel by "Send a test message"
function buildTestMessage(user) {
    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(
            `### 👋 LP Gainz is set up here\nRank updates and other LP Gainz messages will be posted in this channel.\n-# Test message sent by ${user}`,
        ));

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] }, // shows who sent the test without pinging them
    };
}

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName('setup').setDescription('Choose the channel where LP Gainz posts its updates')
        .setContexts(InteractionContextType.Guild)
        // Only members who can manage the server see the command (server admins can change this in Server Settings > Integrations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const { guild } = interaction;
        // The bot's own member is needed to check its permissions in a channel
        if (!guild.members.me) await guild.members.fetchMe();

        // Ephemeral: only the person who ran /setup sees the panel, so only they can click it
        const response = await interaction.reply({
            ...buildSetupPanel(guild),
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            withResponse: true,
        });

        // Listens to the buttons and the channel menu of this panel
        const collector = response.resource.message.createMessageComponentCollector({
            idle: IDLE_TIMEOUT_MS,
            time: MAX_LIFETIME_MS,
        });

        collector.on('collect', async (component) => {
            try {
                if (component.customId === 'setup:channel') {
                    const picked = guild.channels.cache.get(component.values[0]);
                    const missing = picked ? getMissingPermissions(picked) : ['View Channel'];

                    // Saving a channel the bot can't post in would silently lose every update
                    if (missing.length) {
                        const notice = `⚠️ Not saved: I need **${missing.join('**, **')}** in ${picked ?? 'that channel'}. Give me these permissions, or pick another channel.`;
                        return await component.update(buildSetupPanel(guild, { notice }));
                    }

                    guildRegistry.setChannel(guild.id, picked.id);
                    return await component.update(buildSetupPanel(guild, { notice: `✅ Saved. Updates will be posted in ${picked}.` }));
                }

                if (component.customId === 'setup:test') {
                    const channel = getUpdatesChannel(guild);
                    if (!channel) {
                        return await component.update(buildSetupPanel(guild, { notice: '⚠️ No updates channel is set. Pick one first.' }));
                    }

                    // Sending can take a moment: acknowledge the click first, Discord only waits 3 seconds
                    await component.deferUpdate();
                    let notice = `✅ Test message sent in ${channel}.`;
                    try {
                        await channel.send(buildTestMessage(interaction.user));
                    }
                    catch (error) {
                        notice = `⚠️ Couldn't post in ${channel}: ${error.message}.`;
                    }
                    return await component.editReply(buildSetupPanel(guild, { notice }));
                }

                if (component.customId === 'setup:disable') {
                    guildRegistry.setChannel(guild.id, null);
                    return await component.update(buildSetupPanel(guild, { notice: 'Updates are turned off. Pick a channel to turn them back on.' }));
                }

                if (component.customId === 'setup:done') {
                    await component.update(buildSetupPanel(guild, { closed: true }));
                    collector.stop('done');
                }
            }
            catch (error) {
                // Without this, a failed reply would be an unhandled rejection and crash the bot
                console.error('Failed to handle a /setup action', error);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'done') return; // already closed by the "Done" button
            try {
                await interaction.editReply(buildSetupPanel(guild, { closed: true }));
            }
            catch (error) {
                // The panel was dismissed
                if (error.code !== 10008) console.error('Failed to close the /setup panel', error);
            }
        });
    },
};
