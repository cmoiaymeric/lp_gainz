const {
    SlashCommandBuilder,
    InteractionContextType,
    ContainerBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    escapeMarkdown,
} = require('discord.js');
const guildRegistry = require('../../guild-registry');
const riot = require('../../riot_api/summoner');
const { rankEmoji } = require('../../emojis');

const ACCOUNTS_PER_PAGE = 10;
const ACCENT_COLOR = 0x0099ff;

const IDLE_TIMEOUT_MS = 2 * 60_000;
const MAX_LIFETIME_MS = 10 * 60_000;

// A player's rank is reused for 5 minutes, so running /list again (on any server) doesn't call Riot again for them
const RANK_CACHE_MS = 5 * 60_000;
// At least 60 ms between two Riot calls
const CALL_SPACING_MS = 60;

const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER']; // no divisions, only LP

const REGIONS = {
    euw1: { name: 'Europe West', short: 'EUW' },
    na1: { name: 'North America', short: 'NA' },
    oc1: { name: 'Oceania', short: 'OCE' },
    kr: { name: 'Korea', short: 'KR' },
    vn2: { name: 'Vietnam', short: 'VN' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// puuid -> { entry, fetchedAt }. Memory only: losing it on restart just means a few more Riot calls
const rankCache = new Map();

// Spaces out Riot calls, even when /list runs on several servers at the same time
let nextCallAt = 0;
async function waitForRiotSlot() {
    const now = Date.now();
    const callAt = Math.max(now, nextCallAt);
    nextCallAt = callAt + CALL_SPACING_MS;
    await sleep(callAt - now);
}

// Riot's Solo/Duo entry ({ tier, rank, leaguePoints, wins, losses, … }), or null if the player is unranked in Solo/Duo
async function getSoloQueueEntry(account) {
    const cached = rankCache.get(account.puuid);
    if (cached && Date.now() - cached.fetchedAt < RANK_CACHE_MS) return cached.entry;

    await waitForRiotSlot();
    const entries = await riot.getSummonerRank(account.puuid, account.region);
    const entry = entries.find((queue) => queue.queueType === 'RANKED_SOLO_5x5') ?? null;

    rankCache.set(account.puuid, { entry, fetchedAt: Date.now() });
    return entry;
}

const tierIndex = (entry) => (entry ? TIERS.indexOf(entry.tier) : -1);
const divisionIndex = (entry) => (entry ? DIVISIONS.indexOf(entry.rank) : -1);

// Highest first: tier, then division, then LP.
function compareRanks(a, b) {
    return tierIndex(b.entry) - tierIndex(a.entry)
        || divisionIndex(b.entry) - divisionIndex(a.entry)
        || (b.entry?.leaguePoints ?? 0) - (a.entry?.leaguePoints ?? 0)
        || a.account.gameName.localeCompare(b.account.gameName);
}

// Every account of the server with its Solo/Duo entry, sorted. One failing account doesn't break the whole list
async function fetchRanking(accounts) {
    const ranking = [];
    for (const account of accounts) {
        try {
            ranking.push({ account, entry: await getSoloQueueEntry(account) });
        }
        catch (error) {
            console.error(`Couldn't get the rank of ${account.gameName}#${account.tagLine}`, error);
            ranking.push({ account, entry: null, failed: true });
        }
    }
    return ranking.sort(compareRanks);
}

// 'Gold II · 54 LP · 23W 19L (55%)', 'Master · 312 LP · …', 'Unranked'
function describeRank({ entry, failed }) {
    if (failed) return 'Rank unavailable';
    if (!entry) return 'Unranked';

    const tier = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
    const division = APEX_TIERS.includes(entry.tier) ? '' : ` ${entry.rank}`;
    const games = entry.wins + entry.losses;
    const winrate = games > 0 ? ` (${Math.round((entry.wins / games) * 100)}%)` : '';

    return `${tier}${division} · ${entry.leaguePoints} LP · ${entry.wins}W ${entry.losses}L${winrate}`;
}

// Builds the whole message for one page. Called again on every click, and once more when the buttons expire.
function buildListMessage(ranking, page, { expired = false } = {}) {
    const pageCount = Math.max(1, Math.ceil(ranking.length / ACCOUNTS_PER_PAGE));
    const start = page * ACCOUNTS_PER_PAGE;
    const shown = ranking.slice(start, start + ACCOUNTS_PER_PAGE);

    // Same region for everyone: say it once in the header. Mixed regions: show it next to each rank
    const regionCodes = new Set(ranking.map(({ account }) => account.region));
    const sharedRegion = regionCodes.size === 1 ? REGIONS[[...regionCodes][0]]?.name : null;

    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(
            `# Tracked accounts\n-# ${ranking.length} account${ranking.length === 1 ? '' : 's'} on this server`
            + `${sharedRegion ? ` (${sharedRegion})` : ''}, sorted by Solo/Duo rank`,
        ))
        .addSeparatorComponents((separator) => separator);

    shown.forEach((ranked, index) => {
        const { account, entry } = ranked;
        const position = start + index + 1;
        const emoji = entry ? rankEmoji(entry.tier) : ''; // empty if the emoji isn't uploaded: the line still reads fine
        const riotId = escapeMarkdown(`${account.gameName}#${account.tagLine}`);
        const region = sharedRegion ? '' : ` · ${REGIONS[account.region]?.short ?? account.region ?? '?'}`;

        container.addSectionComponents((section) => section
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`## ${[`${position}\\.`, emoji, riotId].filter(Boolean).join(' ')}`))
            .setButtonAccessory((button) => button
                .setCustomId(`list:rank:${position}`) // never clicked, but every button in a message needs its own ID
                .setLabel(`${describeRank(ranked)}${region}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)),
        );
    });

    if (pageCount > 1) {
        container
            .addSeparatorComponents((separator) => separator)
            .addActionRowComponents((row) => row.setComponents(
                new ButtonBuilder().setCustomId('list:previous').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary)
                    .setDisabled(expired || page === 0),
                // Not clickable, only shows the current page
                new ButtonBuilder().setCustomId('list:page').setLabel(`${page + 1} / ${pageCount}`).setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder().setCustomId('list:next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary)
                    .setDisabled(expired || page === pageCount - 1),
            ));
    }

    if (expired && pageCount > 1) {
        container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('-# These buttons have expired. Run `/list` again to browse.'));
    }

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName('list').setDescription('List all accounts tracked by the bot on this server')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const { accounts } = guildRegistry.getGuild(interaction.guildId);

        if (accounts.length < 1) {
            return interaction.reply(`No accounts are currently being tracked on this server.\nTo add one use the command \`/register\`.`);
        }

        // Up to one Riot call per account: show "thinking…" first, Discord only waits 3 seconds for an answer
        await interaction.deferReply();

        // Fetched once: changing pages reuses this ranking, no extra Riot calls
        const ranking = await fetchRanking(accounts);
        const lastPage = Math.ceil(ranking.length / ACCOUNTS_PER_PAGE) - 1;
        let page = 0;

        const message = await interaction.editReply(buildListMessage(ranking, page));

        // Only one page: no buttons, nothing to listen to
        if (lastPage === 0) return;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            idle: IDLE_TIMEOUT_MS,
            time: MAX_LIFETIME_MS,
        });

        collector.on('collect', async (buttonInteraction) => {
            try {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({
                        content: 'Only the person who ran this command can use these buttons. Run `/list` yourself to browse.',
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const step = buttonInteraction.customId === 'list:next' ? 1 : -1;
                page = Math.min(Math.max(page + step, 0), lastPage);
                // update() edits the message the button is on, and answers the click within Discord's 3 seconds
                await buttonInteraction.update(buildListMessage(ranking, page));
            }
            catch (error) {
                // Without this, a failed reply would be an unhandled rejection and crash the bot
                console.error('Failed to handle a /list button', error);
            }
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply(buildListMessage(ranking, page, { expired: true }));
            }
            catch (error) {
                // The message was deleted
                if (error.code !== 10008) console.error('Failed to disable the /list buttons', error);
            }
        });
    },
};
