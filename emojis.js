// Every application emoji by lowercased name: 'rank_gold' -> { name: 'rank_gold', id: '123…', animated: false }
const emojis = new Map();

async function loadEmojis(client) {
    const fetched = await client.application.emojis.fetch(); // one API call at startup
    for (const emoji of fetched.values()) emojis.set(emoji.name.toLowerCase(), { name: emoji.name, id: emoji.id, animated: emoji.animated });
    console.log(`Loaded ${emojis.size} emojis.`);
}

// By name ('champ_KSante', 'spell_Flash', 'rune_Conqueror'…): '<:champ_KSante:123…>'. Empty if it isn't uploaded.
// compact: written '<:_:123…>' instead. Discord draws the emoji from its id, so it looks the same, only the
// hover text becomes '_'. Saves characters where a text has a length limit
function emoji(name, { compact = false } = {}) {
    const found = name && emojis.get(name.toLowerCase());
    if (!found) return '';
    return `<${found.animated ? 'a' : ''}:${compact ? '_' : found.name}:${found.id}>`;
}

// tier as Riot sends it ('GOLD', 'MASTER'…). Empty if missing
function rankEmoji(tier, options) {
    return emoji(tier && `rank_${tier}`, options);
}

module.exports = { loadEmojis, emoji, rankEmoji };
