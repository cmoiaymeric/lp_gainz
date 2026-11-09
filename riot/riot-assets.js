const fs = require('node:fs');
const path = require('node:path');

// Local copy of Riot's Data Dragon (assets/riot, not in git)
const RIOT_ASSETS_DIR = path.join(__dirname, '..', 'assets', 'riot');
const DDRAGON_VERSION = '16.2.1';
const DATA_DIR = path.join(RIOT_ASSETS_DIR, DDRAGON_VERSION, 'data', 'en_US');
const TILES_DIR = path.join(RIOT_ASSETS_DIR, 'img', 'champion', 'tiles');
const SPELL_ICONS_DIR = path.join(RIOT_ASSETS_DIR, DDRAGON_VERSION, 'img', 'spell');
const ITEM_ICONS_DIR = path.join(RIOT_ASSETS_DIR, DDRAGON_VERSION, 'img', 'item');

// Item maps: 11 is Summoner's Rift, 12 is ARAM
const ITEM_MAPS = ['11', '12'];

// Only the summoner spells of Summoner's Rift and ARAM: other modes reuse names (Arena's Flee, Ultimate Spellbook's Placeholder)
const SPELL_MODES = ['CLASSIC', 'ARAM'];

const readData = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

// Missing assets only cost the icons: messages still work without them
function load(label, loader) {
    try {
        return loader();
    }
    catch (error) {
        console.warn(`${label} assets not found, they will have no icon`, error.message);
        return new Map();
    }
}

// lowercased lookup: some tiles don't match champion.json casing (FiddleSticks vs Fiddlesticks)
const tileFiles = load('Champion tile', () => new Map(fs.readdirSync(TILES_DIR).map((file) => [file.toLowerCase(), file])));
const findTile = (championName, skinIndex) => tileFiles.get(`${championName}_${skinIndex}.jpg`.toLowerCase()) ?? null;

// Each map: id from the live game -> { name, emoji: application emoji name, icon: image uploaded as that emoji }

// championId -> { id: 'KSante', name: "K'Sante", emoji: 'champ_KSante', icon }
const champions = load('Champion', () => new Map(Object.values(readData('champion.json').data).map((champion) => {
    const tile = findTile(champion.id, 0);
    return [Number(champion.key), {
        id: champion.id,
        name: champion.name,
        emoji: `champ_${champion.id}`,
        icon: tile && path.join(TILES_DIR, tile),
    }];
})));

// spell1Id / spell2Id -> { name: 'Ignite', emoji: 'spell_Ignite', icon }
const spells = load('Summoner spell', () => new Map(Object.values(readData('summoner.json').data)
    .filter((spell) => spell.modes.some((mode) => SPELL_MODES.includes(mode)))
    .map((spell) => [Number(spell.key), {
        name: spell.name,
        emoji: `spell_${spell.name.replace(/[^A-Za-z0-9]/g, '')}`,
        icon: path.join(SPELL_ICONS_DIR, spell.image.full),
    }])));

// keystone (perks.perkIds[0]) -> { name: 'Conqueror', emoji: 'rune_Conqueror', icon }
const keystones = load('Rune', () => new Map(readData('runesReforged.json')
    .flatMap((style) => style.slots[0].runes)
    .map((rune) => [rune.id, {
        name: rune.name,
        emoji: `rune_${rune.key}`,
        icon: path.join(RIOT_ASSETS_DIR, 'img', rune.icon),
    }])));

// rune tree (perks.perkStyle / perks.perkSubStyle) -> { name: 'Precision', emoji: 'rune_Precision', icon }
const runeStyles = load('Rune tree', () => new Map(readData('runesReforged.json')
    .map((style) => [style.id, {
        name: style.name,
        emoji: `rune_${style.key}`,
        icon: path.join(RIOT_ASSETS_DIR, 'img', style.icon),
    }])));

// Items that can end up in a player's inventory: bought, turned into from another item (Muramana, support item
// upgrades), built from other items, or used up (potions, Biscuit Delivery's biscuits).
// Leaves out the game's internal objects (turret plating, Recall…)
const isInventoryItem = (item) => item.gold?.purchasable || item.specialRecipe || item.from?.length > 0
    || item.tags?.includes('Consumable') || item.consumed;

// item id (item0 to item6 in a match) -> { name: 'Infinity Edge', emoji: 'item_3031', icon }
const items = load('Item', () => new Map(Object.entries(readData('item.json').data)
    .filter(([, item]) => ITEM_MAPS.some((map) => item.maps?.[map]) && isInventoryItem(item))
    .map(([id, item]) => [Number(id), {
        name: item.name.replace(/<[^>]+>/g, ''), // some names hold formatting tags
        emoji: `item_${id}`,
        icon: path.join(ITEM_ICONS_DIR, item.image.full),
    }])));

// Tile file name for this skin, the base skin's if the skin has none (chromas), null if the champion is unknown
function findChampionTile(championId, skinIndex = 0) {
    const champion = champions.get(championId);
    if (!champion) return null;
    return findTile(champion.id, skinIndex) ?? findTile(champion.id, 0);
}

const tilePath = (file) => path.join(TILES_DIR, file);

module.exports = { champions, spells, keystones, runeStyles, items, findChampionTile, tilePath };
