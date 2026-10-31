const fs = require('node:fs');
const path = require('node:path');

const REGISTRY_PATH = path.join(__dirname, 'data', 'guilds.json');

let guilds = {};
if (fs.existsSync(REGISTRY_PATH)){
    guilds = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function save(){
    fs.mkdirSync(path.dirname(REGISTRY_PATH), {recursive: true});

    fs.writeFileSync(`${REGISTRY_PATH}.tmp`, JSON.stringify(guilds, null, 4));
    fs.renameSync(`${REGISTRY_PATH}.tmp`, REGISTRY_PATH);
}

function getGuild(guildId){
    return guilds[guildId] ?? {channelId: null, accounts: []};
}

function getGuildIds(){
    return Object.keys(guilds);
}

function setChannel(guildId, channelId){
    guilds[guildId] = {...getGuild(guildId), channelId};
    save();
}

function addAccount(guildId, account){
    const guild = getGuild(guildId);
    if(guild.accounts.some((tracked) => tracked.puuid === account.puuid)) return false;

    guild.accounts.push(account);
    guilds[guildId] = guild;
    save();
    return true;
}

function removeAccount(guildId, puuid){
    const guild = getGuild(guildId);
    const remaining = guild.accounts.filter((tracked) => tracked.puuid != puuid);
    if (remaining.length === guild.accounts.length) return false;

    guilds[guildId] = {...guild, accounts: remaining};
    save();
    return true;
}

function removeGuild(guildId){
    if (!(guildId in guilds)) return;
    delete(guilds[guildId]);
    save();
}

function clearChannel(channelId){
    const affected = Object.values(guilds).filter((guild) => guild.channelId === channelId);
    for (const guild of affected) guild.channelId = null;
    if(affected.length) save();
}

function getTrackedAccounts(){
    const byPuuid = new Map();
    for (const [guildId, guild] of Object.entries(guilds)){
        for (const account of guild.accounts){
            if (!byPuuid.has(account.puuid)) byPuuid.set(account.puuid, {...account, guildIds: []});
            byPuuid.get(account.puuid).guildIds.push(guildId);
        }
    }
    return [...byPuuid.values()];
}

module.exports = {getGuild, getGuildIds, setChannel, addAccount, removeAccount, removeGuild, clearChannel, getTrackedAccounts}