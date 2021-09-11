import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import axios from "axios";

const StyledLogin = styled.div`
  width: 100%;
  height: 100%;
  color: #202020;
`;

interface ITeams {
    TEAMNAME: string,
    OWNERID: string,
    TEAMSHORTNAME: string
}

const Login = ({ setToken }) => {

    const [teamId, setTeamId] = useState() as [string, (string) => void];
    const [password, setPassword] = useState() as [string, (string) => void];
    const [teams, setTeams] = useState([]) as [Array<ITeams>, (string) => void];


    function handleSubmit(e) {
        e.preventDefault();
        axios.post(`/login`, { teamId, password })
            .then(response => {
                response.data ? setToken(response.data) : console.log('login failed');
                window.location.assign('/');
            });
    }

    useEffect(() => {
        axios.get(`/api/roster/teams`)
            .then(response => {
                setTeams(response.data);
            });
    }, []);

    return (
        <StyledLogin>
            <h1>Please Log In</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    <p>Team</p>
                    <select onChange={e => {
                        setTeamId(e.target.value)
                    }}>
                        {teams.map(t => {
                            return <option key={t.OWNERID} value={t.OWNERID}>{t.TEAMNAME}</option>
                        })}
                    </select>
                </label>
                <label>
                    <p>Password</p>
                    <input type="password" onChange={e => setPassword(e.target.value)} />
                </label>
                <div>
                    <button type="submit">Submit</button>
                </div>
            </form>
        </StyledLogin>
    );
};

export default Login;

Login.propTypes = {
    setToken: PropTypes.func.isRequired
}