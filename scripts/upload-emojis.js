const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const assets = require('../riot/riot-assets');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
const RANK_EMOJI_DIR = path.join(__dirname, '..', 'assets', 'bot', 'ranks', 'emojis');
const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg' };

const rest = new REST().setToken(DISCORD_TOKEN);

// Every emoji the bot uses: ranks, champions, summoner spells, keystones, rune trees and items
function listEmojis() {
    const ranks = fs.readdirSync(RANK_EMOJI_DIR)
        .filter((file) => file.endsWith('.png'))
        .map((file) => ({ name: path.basename(file, '.png'), file: path.join(RANK_EMOJI_DIR, file) })); // rank_gold.png -> rank_gold

    const riotIcons = [];
    const riotAssets = [assets.champions, assets.spells, assets.keystones, assets.runeStyles, assets.items].flatMap((map) => [...map.values()]);
    for (const { emoji, icon } of riotAssets) {
        if (icon) riotIcons.push({ name: emoji, file: icon });
        else console.warn(`No image for ${emoji}, skipped`);
    }

    return [...ranks, ...riotIcons];
}

(async () => {
    const { items: existing } = await rest.get(Routes.applicationEmojis(DISCORD_CLIENT_ID));
    const uploaded = new Set(existing.map((emoji) => emoji.name));

    for (const { name, file } of listEmojis()) {
        if (uploaded.has(name)) {
            console.log(`Skipped ${name}, already uploaded`);
            continue;
        }
        try {
            const image = `data:${MIME_TYPES[path.extname(file)]};base64,${fs.readFileSync(file).toString('base64')}`;
            const emoji = await rest.post(Routes.applicationEmojis(DISCORD_CLIENT_ID), { body: { name, image } });
            console.log(`Uploaded <:${emoji.name}:${emoji.id}>`);
        }
        catch (error) {
            // One bad image doesn't stop the others
            console.error(`Couldn't upload ${name}`, error.message);
        }
    }
})().catch(console.error);
