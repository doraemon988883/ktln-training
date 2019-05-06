var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "kltn_onlinecourse",
    port: '3306'
});

module.exports = con;