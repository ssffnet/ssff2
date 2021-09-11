import React, { useEffect, useState } from 'react';
import axios from "axios";
import { useLocation } from "react-router";

// class Rosters extends React.Component {
//     state = {
//         roster: []
//     };


//     componentDidMount() {
//         axios.post(`/api/rosters`, { ownerId: 1 }).then((res) => {
//             const roster = res.data;
//             this.setState({ roster });
//         });
//     }

//     public render(): JSX.Element {

//         const parts = window.location.pathname.split('/');
//         const p = this.props;


//         return (
//             <div style={{ flex: 5, border: "1px solid black" }}>
//                 <table>
//                 <tbody>
//                     {this.state.roster.map((rows, rowNum) => (
//                         <tr key={rowNum.toString()}>
//                             {Object.entries(rows).map((entry, index) => (
//                                 <td key={index.toString()}>{entry[1]}</td>
//                                // <td key={index.toString()}>{window.location.pathname}</td>
//                             ))}
//                         </tr>
//                     ))}
//                     </tbody>
//                 </table>
//             </div>
//         );
//     }
// }

// export default Rosters;


const Rosters = (props) => {

    const [roster, setRoster] = useState() as [Array<object>, Function];

    useEffect(() => {
        axios.post(`/api/rosters`, { ownerId: 1 })
            .then(response => {
                setRoster(response.data);
                console.log(roster);
            });
    }, []);

    return (
        <div style={{ flex: 5, border: "1px solid black" }}>
            <table>
                <tbody>
                    { roster && roster.map((rows, rowNum) => (
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

export default Rosters