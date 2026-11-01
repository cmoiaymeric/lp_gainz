const rankEmojis = new Map(); // 'GOLD' -> '<:rank_gold:123…>'

async function loadEmojis(client) {
    const emojis = await client.application.emojis.fetch(); // one API call at startup
    for (const emoji of emojis.values()) {
        if (emoji.name.startsWith('rank_')) rankEmojis.set(emoji.name.slice('rank_'.length).toUpperCase(), emoji.toString());
    }
    console.log(`Loaded ${rankEmojis.size} rank emojis.`);
}

// tier as Riot sends it ('GOLD', 'MASTER'…). Empty if missing
function rankEmoji(tier) {
    return rankEmojis.get(tier) ?? '';
}

module.exports = { loadEmojis, rankEmoji };