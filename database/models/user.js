var Sequelize = require('sequelize');
var sequelize = require('../sequelize');

module.exports = sequelize.define('user', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: Sequelize.STRING(64).BINARY,
        unique: true,
    },
    password: Sequelize.STRING(32).BINARY,
    exp: Sequelize.INTEGER,
    rating: Sequelize.INTEGER.UNSIGNED,
    shuoshuoban: Sequelize.BOOLEAN
}, {
    timestamps: false
});

