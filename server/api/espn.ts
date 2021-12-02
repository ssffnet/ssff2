import axios from 'axios';
import { ELOOP } from 'constants';
import { query } from 'express';
import * as sql from './sql';


interface IEspnHtmlRoster {
    team: string,
    name: string,
    href: string,
    uid: string,
    guid: string,
    id: number,
    height: string,
    weight: number,
    age: number,
    position: string,
    jersey: number,
    birthDate: Date,
    headshot: string,
    lastName: string,
    experience: number,
    college: string,
    birthPlace: string
}

interface IEspnRoster {
    Id: number,
    NFLTeam: string,
    Name: string,
    Height: string,
    Weight: number,
    POS: string,
    Number: number,
    DOB: Date,
    Exp: number,
    College: string,
}

export async function getRoster(team: string): Promise<Array<IEspnHtmlRoster>> {

    const url = `https://www.espn.com/nfl/team/roster/_/name/${team.toLowerCase()}/`;

    const result = await axios.get(url);

    const offensivePositions = ['QB', 'RB', 'FB', 'WR', 'TE', 'PK'];

    const posMap = { 'FB': 'RB', 'PK': 'K' };

    const teamMap = { 'WSH': 'WAS' };

    let lines = result.data.match(/\{"name":"[^"]+","href":"[^"]+","uid":[^}]+\}/g);

    let players =
        JSON.parse(`[${lines.join(',')}]`)
            .filter(player => offensivePositions.includes(player.position));

    players.forEach(player => {
        player.team = team.toUpperCase();
        player.position = posMap[player.position] || player.position;
        player.team = teamMap[player.team] || player.team;
    });

    return players;
}


export async function getRosters(): Promise<Array<IEspnRoster>> {

    const teams = await sql.query(`SELECT [TeamID] AS id FROM NFLTeams FOR JSON AUTO`) as Array<{ id: string }>;

    const p = [];

    teams.forEach(team => p.push(getRoster(team.id)));

    let rosters = [].concat(...await Promise.all(p));

    rosters = rosters.map(ep => <IEspnRoster>{
        Id: parseInt(ep.id),
        NFLTeam: ep.team,
        Name: ep.name,
        Height: ep.height,
        Weight: parseInt(ep.weight.split(' ')[0]),
        POS: ep.position,
        Number: parseInt(ep.jersey),
        DOB: new Date(ep.birthDate),
        Exp: parseInt(ep.experience),
        College: ep.college,
    });

    const query = `
        DELETE FROM Espn_Roster;
        INSERT INTO 
            Espn_Roster (
                Id, 
                NFLTeam, 
                Name, 
                Height,
                Weight,
                POS,
                Number,
                DOB,
                Exp,
                College)
        SELECT 
            *
        FROM 
            OPENJSON(N'${JSON.stringify(rosters, null, 2).replace(/'/g, "''")}', '$')
        WITH (
            Id	        int,
            NFLTeam	    char(3)	,
            Name	    nvarchar(32),
            Height	    char(6),
            Weight	    smallint,
            POS	        char(2),
            Number	    tinyint,
            DOB	        date,
            Exp	        tinyint,
            College	    nvarchar(32)
        );`;

    await sql.query(query);



    let players = await sql.query(`
        SELECT
            P.*, A.Espn
        FROM
            Players P
        LEFT JOIN
            AlternateIds A
        ON
            P.PlayerIndex = A.PlayerIndex
        WHERE
            A.Espn is NULL AND
            P.POS <> '6D/ST'
        FOR
            JSON AUTO;
        `) as Array<{ PlayerIndex: string, Name: string, NFLTeam: string, POS: string, DOB: Date, College: string }>;


    const matches = [];

    players.forEach(player => {

        const name1 = player.Name.replace(/\./g, '').toUpperCase().split(' ', 2).join(' ');

        let match = rosters.find(p => {

            const name2 = p.Name.replace(/\./g, '').toUpperCase().split(' ', 2).join(' ');

            return name1 == name2 &&
                p.NFLTeam == player.NFLTeam &&
                p.POS == player.POS.slice(1);

        });

        //     // if (!match) {

        //     //     match = rosters.find(p => {

        //     //         return p.team == player.NFLTeam &&
        //     //             p.position == player.POS.slice(1) &&
        //     //             new Date(p.birthDate) == player.DOB &&
        //     //             p.college == player.College;

        //     //     });

        //     //     if (match) debugger;
        //     // }

        match && matches.push({ PlayerIndex: player.PlayerIndex, Espn: match.id });

    });

    await sql.query(`
            -- Insert new entries if not present
            INSERT INTO
                AlternateIds
            SELECT
                P.PlayerIndex, null, null, null
            FROM
                Players P
            LEFT JOIN
                AlternateIds A
            ON
                P.PlayerIndex = A.PlayerIndex
            WHERE
                A.PlayerIndex is NULL AND
                P.POS <> '6D/ST';

            BEGIN TRAN
            ${matches.map(m => `UPDATE AlternateIds SET Espn='${m.Espn}' WHERE PlayerIndex='${m.PlayerIndex}';`).join('\n\t\t')}
            COMMIT TRAN
        `);



    return rosters;

}
