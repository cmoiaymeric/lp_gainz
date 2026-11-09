require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

async function fetchAccount(name, tag){
    let reqUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(reqUrl);
    if (!response.ok){
        throw new Error(`Get account PUUID API call failed (${response.status})`);
    }
    const data = await response.json();
    return data;
}

async function fetchSummonerByPuuid(puuid, region){
    let reqUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;

    const response = await fetch(reqUrl);
    if (!response.ok){
        throw new Error(`Get summoner API call failed (${response.status})`);
    }
    return response.json();
}

async function fetchSummonerRank(puuid, region){
    let reqUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;

    const response = await fetch(reqUrl);
    if(!response.ok){
        throw new Error(`Get summoner ranks API call failed (${response.status})`);
    }
    return response.json();
}

async function fetchLiveGame(puuid, region){
    let reqUrl = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${RIOT_API_KEY}`;

    const response = await fetch(reqUrl);
    if(response.status === 404) return null;
    if(!response.ok){
        throw new Error(`Get live game API call failed (${response.status})`);
    }
    return response.json();
}

module.exports = {fetchAccount, fetchSummonerByPuuid, fetchSummonerRank, fetchLiveGame};
