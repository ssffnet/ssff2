import axios from "axios";
import { TIMEOUT } from "dns";
import * as React from "react";
import styled from 'styled-components';

const MainDiv = styled.div`
    background: #202020;
    color: #C0C0C0;
    font-size: 14px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    flex-grow: 1;
    height: 100vh;
    padding: 24px;
    position: flex;
`

function sendSms(): void {
    axios.get(`/sms`);
    return;
}

function getSeasonSchedule(): void {
    axios.get(`/api/schedule`)
        .then(result => {
            const games = result.data;
            console.log(games);
        });
    return;
}

function getRosters(): void {
    axios.get(`/api/rosters`)
        .then(result => {
            const players = result.data;
            console.log(players);
        });
    return;
}

function getRotowire(): void {
    axios.get(`/api/rotowire`)
        .then(result => {
            const players = result.data;
            console.log(players);
        });
    return;
}


// function rotowireLogin(): void {
//     const formData = new FormData();
//     formData.append('username', 'ljoy');
//     formData.append('password', 'vcisaa');

//     axios.post(`https://www.rotowire.com/users/login.php`, formData, {
//         headers: {
//             'content-type': 'application/x-www-form-urlencoded'
//         }
//     })
//         .then(result => {
//             const players = result.data;
//             console.log(players);
//         });
//     return;
// }

function rotowireLogin(): void {
    axios.get(`/api/rotowire/depthchart`)
        .then(result => {
            const players = result.data;
            console.log(players);
        });
    return;
}

function depthChartOut(): void {
    axios.get(`/api/depthChartOut`)
        .then(result => {
            console.log(result.data);
        });
    return;
}

let autoUpdates = false;
let timer;

function getScores(): void {

    autoUpdates = !autoUpdates;

    // if (!autoUpdates) {
    //     clearTimeout(timer);
    //     console.log('stop');

    // } else {
    //     console.log('start');
    //     timer = setInterval(() => {
    //         axios.get(`/api/scores`)
    //             .then(result => {
    //                 console.log(result.data);
    //             });
    //     }, 1000 *  5);
    // }

    axios.get(`/api/scores`)
    .then(result => {
        console.log(result.data);
    });

    return;
}

function getEspnRosters(): void {
    axios.get(`/api/espn/rosters`)
        .then(result => {
            console.log(result.data);
        });
    return;
}


class Main extends React.Component {
    public render(): JSX.Element {
        return (
            <MainDiv>
                <h1>Welcome to SSFF</h1>
                <button onClick={sendSms}>Send SMS</button>
                <button onClick={getRosters}>Get NFL Rosters to DB</button>
                <button onClick={getSeasonSchedule}>Get NFL Schedule to DB</button>
                <button onClick={getRotowire}>Get RotoWire players</button>
                <button onClick={rotowireLogin}>RotoWire Login</button>
                <button onClick={depthChartOut}>Print Depth Chart</button>
                <button onClick={getScores}>GetScores</button>
                <button onClick={getEspnRosters}>EspnRosters</button>
            </MainDiv>
        );
    }
}

export default Main;