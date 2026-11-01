const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
const EMOJI_DIR = path.join(__dirname, '..', 'assets', 'bot', 'ranks', 'emojis');

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
    const { items: existing } = await rest.get(Routes.applicationEmojis(DISCORD_CLIENT_ID));
    const uploaded = new Set(existing.map((emoji) => emoji.name));

    for (const file of fs.readdirSync(EMOJI_DIR).filter((f) => f.endsWith('.png'))) {
        const name = path.basename(file, '.png'); // rank_gold.png -> rank_gold
        if (uploaded.has(name)) {
            console.log(`Skipped ${name}, already uploaded`);
            continue;
        }
        const image = `data:image/png;base64,${fs.readFileSync(path.join(EMOJI_DIR, file)).toString('base64')}`;
        const emoji = await rest.post(Routes.applicationEmojis(DISCORD_CLIENT_ID), { body: { name, image } });
        console.log(`Uploaded <:${emoji.name}:${emoji.id}>`);
    }
})().catch(console.error);