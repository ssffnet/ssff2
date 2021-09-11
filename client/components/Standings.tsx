import * as React from "react";
import axios from "axios";

class Standings extends React.Component {
    state = {
        standings: [],
    };

    componentDidMount() {
        axios.post(`/api/standings`, { ownerId: 1 }).then((res) => {
            const standings = res.data;
            this.setState({ standings });
        });
    }

    public render(): JSX.Element {

        if(this.state.standings.length === 0) {
            return <span>Standings</span>
        }

        return (
            <div style={{ flex: 5, border: "1px solid black" }}>
                <table>
                <tbody>
                    {this.state.standings.map((rows, rowNum) => (
                        <tr key={rowNum.toString()}>
                            {Object.entries(rows).map((entry, index) => (
                                <td key={index.toString()}>{entry[1]}</td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    }
}

export default Standings;
