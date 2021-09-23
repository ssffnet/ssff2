import sql from 'mssql';

var dbConfig = {
    server: "ssffsql.database.windows.net",
    database: "ssffdb",
    user: "ssff",
    password: "Ky01HW#DuN8d",
    port: 1433,
    // Since we're on Windows Azure, we need to set the following options
    options: {
        encrypt: true
    }
};

const conn = new sql.ConnectionPool(dbConfig);

(async () => {
    await conn.connect();
})();


export async function query(query: string, print = false): Promise<Array<object>> {

    //query = query.replace(/'/g, "''");

    //print && console.log(query);

    return new Promise((resolve, reject) => {
        conn.query(query, async function (err, results) {
            if (err) {
                console.error(JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err));
            }
            const jsonResult = results?.recordset?.[0]?.['JSON_F52E2B61-18A1-11d1-B105-00805F49916B'];
            resolve(jsonResult ? JSON.parse(jsonResult) : results);
        });
    });

}