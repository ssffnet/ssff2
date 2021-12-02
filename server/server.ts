import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import * as scores from './api/scores';
import feed, { IPlayersFeed, ISchedule } from './api/mySportsFeed'
import * as sql from './api/sql';
import * as sms from './api/sms';
import * as espn from './api/espn';



const app = express();
const port = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));
app.use(cookieParser());

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));






app.post('/login', (req, res) => {

    // get credentials from post
    const { teamId, password } = req.body;

    const query = `SELECT [OwnerId] FROM FFOwners WHERE [OwnerId]=${teamId} AND [Password]='${password.trim()}' FOR JSON AUTO;`

    if (!teamId || !password) {
        res.send(undefined);
        return;
    }

    sql.query(query)
        .then(recordSet => {

            const ownerId = recordSet[0]['OwnerId'];

            if (ownerId != teamId) {
                res.send(undefined);
                return;
            }

            // generate JWT
            const token = jwt.sign({
                id: teamId
            }, 'secret', { expiresIn: '1y' });

            console.log(token);

            res.cookie('jwt', token, { httpOnly: true, secure: false, maxAge: 3600000 })
            res.redirect('/')

            //res.send(token);

        })
        .catch(err => {
            res.send(undefined);
        });

});


app.post('/api/standings', async (req, res) => {
    console.log(`/standings`);
    const ownerId = req.body.ownerId;
    // sql.query(`SELECT * FROM FFOwners ORDER BY Pct DESC, PF DESC FOR JSON AUTO;`, function (err, results) {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     }
    //     const key = Object.keys(results.recordset[0])[0];
    //     const json = results.recordset[0][key];
    //     res.send(json);
    // });
});


app.get('/api/scores', async (req, res) => {
    console.log(`/api/scores`);

    scores.getScoring(12);

    res.send({});
});


app.get('/api/roster/teams', async (req, res) => {
    console.log(`/standings`);
    // conn.query(`SELECT [TEAMNAME], [OWNERID], [TEAMSHORTNAME] FROM [FFOWNERS] FOR JSON AUTO;`, function (err, results) {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     }
    //     const key = Object.keys(results.recordset[0])[0];
    //     const json = results.recordset[0][key];
    //     res.send(json);
    // });
});


app.get('/api/rosters', async (req, res) => {

    console.log('/api/rosters');

    const request = 'players.json?rosterstatus=assigned-to-roster,assigned-to-injury-list&position=QB,RB,FB,WR,TE,K';
    //const request = 'players.json?position=QB,RB,FB,WR,TE,K';

    let playersFeed = (await feed(request)) as IPlayersFeed;

    const pos = {
        'QB': '1QB',
        'RB': '2RB',
        'WR': '3WR',
        'TE': '4TE',
        'K': '5K'
    }

    const nameMap = {
        'LA': 'LAR'
    }

    console.log(`/api/rosters : Downloaded ${playersFeed.players.length} players.`);

    const players = playersFeed.players.map(e => {

        const p = e.player;

        const f = {
            PlayerIndex: p.id.toString(),
            Name: `${p.firstName} ${p.lastName}`,
            OwnerID: null,
            LastName: p.lastName,
            FirstName: p.firstName,
            NFLTeam: nameMap[p.currentTeam?.abbreviation] || p.currentTeam?.abbreviation || null,
            POS: pos[p.primaryPosition !== 'FB' ? p.primaryPosition : 'RB'],
            Number: p.jerseyNumber,
            College: p.college,
            Height: p.height,
            Weight: p.weight,
            IR: false,
            DOB: p.birthDate,
            Exp: null,
            Rank: null,
            Active: true
        }

        return f;
    });

    const chunkSize = 100;
    const chunks = players.slice(0, Math.ceil(players.length / chunkSize)).
        map((c, i) => players.slice(chunkSize * i, chunkSize * (i + 1)));


    await sql.query('DELETE FROM Players_temp;');

    chunks.forEach(async chunk => {

        const query = `
        INSERT INTO 
            Players_temp
        SELECT
            * 
        FROM 
            OPENJSON(N\'${JSON.stringify(chunk).replace(/'/g, "''")}\', '$')
        WITH (
            PlayerIndex     varchar(8),
            Name            nvarchar(64),
            OwnerID         smallint,
            LastName        nvarchar(64),
            FirstName       nvarchar(64),
            NFLTeam         varchar(3),
            POS             varchar(5),
            Number          tinyint,
            College         nvarchar(128),
            Height          varchar(4),
            Weight          smallint,
            IR              bit,
            DOB             datetime,
            Exp             smallint,
            Rank            smallint,
            Active          bit
        );`;

        await sql.query(query);

    });

    // Add new players to
    const query = `
        BEGIN TRANSACTION;

        -- Add New Players

        INSERT INTO 
            Players_Updates
        SELECT
            PT.PlayerIndex, GETUTCDATE(), 'add', PT.PlayerIndex, null
        FROM
            Players_temp PT
        LEFT JOIN
            Players P
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            P.PlayerIndex is null AND
            PT.NFLTeam is not null;
        
        INSERT INTO 
            Players
        SELECT
            PT.*
        FROM
            Players_temp PT
        LEFT JOIN
            Players P
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            P.PlayerIndex is null AND
            PT.NFLTeam is not null;


        -- Deactivate Missing Players

        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'inactive', 0, 1
        FROM
            Players P
        LEFT JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            PT.PlayerIndex is null AND
            P.Active = 1 AND
            P.POS <> '6D/ST';

        UPDATE 
            Players
        SET
            Players.Active=0
        FROM
            Players P
        LEFT JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            PT.PlayerIndex is null AND
            P.POS <> '6D/ST';


        -- Update player info

        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'num', PT.Number, P.Number
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.Number, 0) <> PT.Number;
        
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'col', PT.College, P.College
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.College, '') <> PT.College;
        
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'dob', PT.DOB, P.DOB
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.DOB, '') <> PT.DOB;
        
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'height', PT.Height, P.Height
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.Height, '') <> PT.Height;
        
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'weight', PT.Weight, P.Weight
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.Weight, 0) <> PT.Weight;

        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'name', PT.Name, P.Name
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            P.Name <> PT.Name;

        UPDATE
            Players
        SET
            Players.DOB = PT.DOB,
            Players.Number = PT.Number,
            Players.College = PT.College,
            Players.Height = PT.Height,
            Players.Weight = PT.Weight,
            Players.LastName = PT.LastName,
            Players.FirstName = PT.FirstName,
            Players.Name = PT.FirstName + ' ' + PT.LastName
        FROM
            Players_temp PT
        JOIN
            Players P
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.DOB, '') <> PT.DOB OR
            ISNULL(P.Number, 0) <> PT.Number OR
            ISNULL(P.College, '') <> PT.College OR
            ISNULL(P.Height, '') <> PT.Height OR
            ISNULL(P.Weight, 0) <> PT.Weight OR
            ISNULL(P.Name, '') <> PT.Name;

        -- Team Change
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'team', PT.NFLTeam, P.NFLTeam
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.NFLTeam, '') <> PT.NFLTeam;
        
        UPDATE
            Players
        SET
            Players.NFLTeam = PT.NFLTeam
        FROM
            Players_temp PT
        JOIN
            Players P
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.NFLTeam, '') <> PT.NFLTeam;

        -- position change
        INSERT INTO 
            Players_Updates
        SELECT
            P.PlayerIndex, GETUTCDATE(), 'pos', PT.POS, P.POS
        FROM
            Players P
        JOIN
            Players_temp PT
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.POS, '') <> PT.POS;

        UPDATE
            Players
        SET
            Players.POS = PT.POS
        FROM
            Players_temp PT
        JOIN
            Players P
        ON
            P.PlayerIndex = PT.PlayerIndex
        WHERE
            ISNULL(P.POS, '') <> PT.POS;
            
        COMMIT;`;

    console.log(query);

    await sql.query(query);

    res.json(players);

});


app.get('/api/schedule', async (req, res) => {

    console.log('/api/schedule');

    const request = '2021-2022-regular/games.json';

    const result = await feed(request) as ISchedule;

    const games = [];

    result.games.forEach(g => {

        const game = g.schedule;

        games.push({
            Week: game.week,
            Date: game.startTime,
            Day: new Date(game.startTime).toLocaleDateString('en-US', { weekday: 'short' }),
            TeamID: game.awayTeam.abbreviation,
            OppTeamID: game.homeTeam.abbreviation,
            Home: false,
            Field: game.venue.name,
            Status: 0,
            NFLid: game.id,
        });

        games.push({
            Week: game.week,
            Date: game.startTime,
            Day: new Date(game.startTime).toLocaleDateString('en-US', { weekday: 'short' }),
            TeamID: game.homeTeam.abbreviation,
            OppTeamID: game.awayTeam.abbreviation,
            Home: true,
            Field: game.venue.name,
            Status: 0,
            NFLid: game.id,
        });

    });

    result.teamByeWeeks.forEach(bye => {

        games.push({
            Week: bye.byeWeeks[0],
            Date: null,
            Day: null,
            TeamID: bye.team.abbreviation,
            OppTeamID: 'BYE',
            Home: false,
            Field: null,
            Status: 0,
            NFLid: null,
        });

    });

    await sql.query('DELETE FROM NFLSchedule_temp;');

    const gameJson = JSON.stringify(games).replace(/'/g, "''");

    const query = `
        INSERT INTO 
            NFLSchedule_temp
        SELECT 
            * 
        FROM 
            OPENJSON(N\'${gameJson}\', '$')
        WITH (
            Week	    smallint,
            Date	    datetime,
            Day	        nvarchar(8),
            TeamID	    nvarchar(6),
            OppTeamID	nvarchar(6),
            Home	    bit,
            Field	    nvarchar(100),
            Status	    nvarchar(40),
            NFLid	    nvarchar(100)
        );`;

    console.log(query);

    await sql.query(query);

    res.json(games);

});


app.get('/api/rotowire', async (req, res) => {

    console.log('/api/rotowire');

    const formData = new FormData();
    formData.append("username", "ljoy");
    formData.append("password", "vcisaa");
    formData.append("landingPage", '/');
    //username=ljoy&password=vcisaa&landingPage=%2F

    const header = { headers: formData.getHeaders() };

    const headers = {
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    };

    const result = await axios.get("https://www.rotowire.com/frontend/ajax/search-players.php", { params: { 'searchTerm': '  ', 'sport': 'NFL' } });


    const fantasyPositions = ['RB', 'QB', 'WR', 'TE', 'K', 'FB'];
    const teamMap = { LAR: "LA" };
    const posMap = { FB: "2RB", RB: '2RB', QB: '1QB', WR: '3WR', TE: '4TE', K: '5K' };

    let players = result.data.players;

    // filter player to just fantasy positions
    players = players.filter(item => fantasyPositions.includes(item.span));//&& item.text != 'Free Agent');

    players = players.map(p => {
        const [first, last] = p.name.replace("'", "''").split(' ', 2);
        return {
            TeamID: teamMap[p.text] || p.text,
            First: first,
            Last: last,
            POS: posMap[p.span] || p.span,
            RotoID: parseInt(p.link.replace('/football/player.php?id=', '')),
            Rank: null,
            Depth: null
        };
    });


    // alt:'LAC'
    // link:'/football/player.php?id=8730'
    // logo:'https://content.rotowire.com/images/teamlogo/football/100LAC.png?v=7'
    // name:'Oday Aboushi'
    // path:'E:\\rotowire\\website/images/teamlogo/football/100LAC.png'
    // span:'OG'
    // text:'LAC'

    await sql.query('DELETE FROM RotoPlayers;');

    const query = `
        INSERT INTO RotoPlayers
        SELECT * 
        FROM OPENJSON(
            N\'${JSON.stringify(players)}\'
            , '$')
        WITH (
            RotoID  smallint,
            First   nvarchar(255),
            Last    nvarchar(255),
            POS	    nvarchar(3),
            TeamID	nvarchar(4),
            Rank	int,
            Depth	int
        );`;

    console.log(query);

    await sql.query(query);

    return;
});


app.get('/api/scoresw', async (req, res) => {

    console.log('/api/scoresw');

    const lines = await scores.getBoxScore('2021-2022-regular', 1, 64893);

    const jsonLines = JSON.stringify(lines).replace(/'/g, "''");

    const query = `
        INSERT INTO 
            Scoring
        SELECT 
            * 
        FROM 
            OPENJSON(N\'${jsonLines}\', '$')
        WITH (
            Week	    smallint,
            Time	    varchar(8),
            TeamID	    varchar(3),
            PlayerIndex	varchar(8),
            PlayerName	nvarchar(32),
            ScoreType	varchar(6),
            ScoreMethod	varchar(6),
            Yards	    int,
            Points	    int,
            FPoints	    decimal(7, 4),
            Attempts	varchar(8),
            OwnerID	    smallint
        );`;

    console.log(query);

    await sql.query(query);

    res.json({});
});


async function downloadRotowireDepthChart() {

    let options = {
        headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9,mt;q=0.8,af;q=0.7,sv;q=0.6',
            'content-type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: function (status) {
            return status >= 200 && status <= 302
        }
    }

    let response = await axios.post("https://www.rotowire.com/users/login.php/", `username=${'ljoy'}&password=${'vcisaa'}&landingPage=${'%2F'}`, options);

    const cookie = response.headers['set-cookie'][0].split(';')[0];

    const options2 = {
        headers: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9,mt;q=0.8,af;q=0.7,sv;q=0.6',
            'cookie': cookie
        }
    };

    response = await axios.get("https://www.rotowire.com/football/depth-charts.php", options2);

    return response.data;

}


function parseDepthChartHtml(depthChartHtml: string) {

    const depthChart = [];

    const positionMap = {
        'Quarterback': '1QB',
        'Running Back': '2RB',
        'Wide Receiver': '3WR',
        'Tight End': '4TE',
        'Kicker': '5K'
    }

    const reTeamHtmlBlocks = /<div class="depth-charts__block">[\s\S]+?<\/div>[\s\S]+?\n\t{5}<\/div>/g;
    const rePositionBlocks = /<div class="depth-charts__pos col">[\s\S]+?<\/div>[\s\S]+?\n\t{9}<\/div>/g;
    const rePlayer = /<a href="\/football\/player\.php\?id=(\d+)">[\n\s\S]+?<span class="hide-until-xs">(.+?)<\/span><span class="hide-xs-up">.+?<\/span>(.+?)<\/a>/g;
    const reTeam = /team=([A-Z]+)\"/;
    const rePos = /<div class="depth-charts__pos-head">(.+?)<\/div>/;

    // break up the html into 32 team sections
    depthChartHtml.match(reTeamHtmlBlocks).forEach(htmlTeamBlock => {

        const team = htmlTeamBlock.match(reTeam)[1];

        // break the team block into position blocks
        htmlTeamBlock.match(rePositionBlocks).forEach(htmlPosBlock => {

            const pos = positionMap[htmlPosBlock.match(rePos)[1]];

            // get each player link from the position block
            [...htmlPosBlock.matchAll(rePlayer)].forEach((item, i) => {

                depthChart.push({
                    Id: item[1],
                    First: item[2].replace(/'/g, "''"),
                    Last: item[3].trim().replace(/'/g, "''"),
                    Pos: pos,
                    Team: team,
                    Depth: i + 1
                });

            });

        });

    });

    return depthChart;

}


app.get('/api/rotowire/depthchart', async (req, res) => {

    console.log('/api/rotowire/depthchart');

    const depthChartHtml = await downloadRotowireDepthChart();

    const depthChart = parseDepthChartHtml(depthChartHtml);

    // depthChart.length = 4;

    await sql.query('DELETE FROM Depth;');

    const query = `
        INSERT INTO Depth
        SELECT * 
        FROM OPENJSON(
            N\'${JSON.stringify(depthChart)}\'
            , '$')
        WITH (
            Id      int,
            First   nvarchar(32),
            Last    nvarchar(32),
            Pos	    nvarchar(5),
            Team	nvarchar(3),
            Depth	int
        );`

    await sql.query(query);

    //console.log(query);

    res.json(depthChart);

});


app.get('/api/espn/rosters', async (req, res) => {

    console.log('/api/espn/rosters');

    const result = await espn.getRosters();

    res.send(result);

});


app.get('/sms', async (req, res) => {
    console.log(`/sms`);
    const result = await sms.send("Hello World 👋🏻 via SMS");
    res.send(result);
});


app.get('/api/depthChartOut', async (req, res) => {

    console.log('/api/depthChartOut');

    const query = `
        SELECT 
            D.Team, D.Pos, D.First + ' ' + D.Last as Name, P.OwnerID, D.Depth
        FROM
            Depth D
        LEFT JOIN
            Players P
        ON
            D.Id = P.RotoID
        ORDER BY
            Team, Pos, D.Depth
        FOR JSON PATH;`

    interface player {
        Team: string,
        Id: number,
        Pos: string,
        Name: string,
        Depth: number,
        OwnerID: number
    }

    const depth = (await sql.query(query)) as player[];

    const byTeam: Record<string, Record<string, { name: string, depth: number, owned: boolean }[]>> = {};

    // Group the players by Team then Position
    depth.forEach(p => {
        const pos = p.Pos.substring(1);
        byTeam[p.Team] = byTeam[p.Team] || {};
        byTeam[p.Team][pos] = byTeam[p.Team as string][pos] || [];
        byTeam[p.Team][pos].push({ name: p.Name, depth: p.Depth, owned: !!(p.OwnerID) });
    });

    const table = [];

    table.push(`<table>`);

    Object.keys(byTeam).forEach(team => {

        table.push(`<tr class="team">`);

        table.push(`<td class="teamName">${team}</td>`);

        table.push(`<td>`);

        table.push(`<table class="players">`);

        Object.keys(byTeam[team]).forEach((pos, index) => {

            table.push(`<tr>`);

            //index === 0 && table.push(`<td rowspan="5">${team}</td>`);

            table.push(`<td class="position">${pos}</td>`);

            for (let i = 0; i < 5; i++) {
                const name = byTeam[team][pos][i]?.name || '&nbsp;'
                const owned = byTeam[team][pos][i]?.owned || false;
                table.push(`<td class="player${owned ? ' owned' : ''}">${name}</td>`);
            }

            table.push(`</tr>`);

        });

        table.push(`</table>`);

        table.push(`</td>`);

        table.push(`</tr>`);

    });

    table.push(`</table>`);

    const html = table.join('\n');

    fs.writeFileSync('table.html', html);

    console.log(html);

    res.json(html);

});


app.get('*', function (req, res) {
    console.log(`/catch-all ${req.url}`);
    res.redirect('/');
});
