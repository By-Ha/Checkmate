var Sequelize = require('sequelize');
var sequelize = require('../sequelize');

module.exports = sequelize.define('comment', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pid: Sequelize.INTEGER,
    parent: Sequelize.INTEGER,
    uid: Sequelize.INTEGER,
    username: Sequelize.STRING(64),
    favor: Sequelize.INTEGER,
    comment: Sequelize.TEXT,
    created: Sequelize.DATE
}, {
    timestamps: false
});
