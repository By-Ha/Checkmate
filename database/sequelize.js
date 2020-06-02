var Sequelize = require('sequelize');
var config = require('../config');

var sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, {
    host: 'localhost',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    },
    timezone: '+08:00',
    define: {
        //prevent sequelize from pluralizing table names
        freezeTableName: true
    }
});

// 连接验通
sequelize.authenticate().then(() => {
    console.log('Connecting To Database Success.');
}).catch(err => {
    console.error('Connecting To Database Failed', err);
});

module.exports = sequelize;