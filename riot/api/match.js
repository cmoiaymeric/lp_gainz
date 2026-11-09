require('dotenv').config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Matches are stored per continent, not per server
const REGIONAL_ROUTES = {
    euw1: 'europe', eun1: 'europe', tr1: 'europe', ru: 'europe', me1: 'europe',
    na1: 'americas', br1: 'americas', la1: 'americas', la2: 'americas',
    kr: 'asia', jp1: 'asia',
    oc1: 'sea', ph2: 'sea', sg2: 'sea', th2: 'sea', tw2: 'sea', vn2: 'sea',
};

// matchId: '<platformId>_<gameId>' of the live game, like 'EUW1_8039370466'.
// null while Riot hasn't published the match yet (a few minutes after the game ends)
async function fetchMatch(matchId, region){
    const route = REGIONAL_ROUTES[region];
    if(!route){
        throw new Error(`No match route for region ${region}`);
    }
    let reqUrl = `https://${route}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;

    const response = await fetch(reqUrl);
    if(response.status === 404) return null;
    if(!response.ok){
        throw new Error(`Get match API call failed (${response.status})`);
    }
    return response.json();
}

module.exports = { fetchMatch };
