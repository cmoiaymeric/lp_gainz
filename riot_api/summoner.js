require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const apiUrl = `https://europe.api.riotgames.com/`


async function getAccount(name, tag){
    let reqUrl = apiUrl + `riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(reqUrl);
    if (!response.ok){
        throw new Error(`Get account PUUID API call failed (${response.status})`);
    }
    const data = await response.json();
    return data;
}

async function getSummonerByPuuid(puuid, region){
    let reqUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;

    const response = await fetch(reqUrl);
    if (!response.ok){
        throw new Error(`Get summoner API call failed (${response.status})`);
    }
    return response.json();
}

module.exports = {getAccount, getSummonerByPuuid};
