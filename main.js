const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { DISCORD_TOKEN } = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.cooldowns = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolder = fs.readdirSync(foldersPath);

for (const folder of commandFolder) {
    const commandsPath = path.join(foldersPath, folder); // commandsPath is now an array which contains ['utility']
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js')); // array is now every file in utility folder | .filter() on the array read to only keep .js files
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file); // same thing
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
        else {
            console.log(`[WARNING] The command at ${filePath} is missing a require "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles){
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once){
        client.once(event.name, (...args) => event.execute(...args));
    }
    else{
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(DISCORD_TOKEN);