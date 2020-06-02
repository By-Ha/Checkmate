var Sequelize = require('sequelize');
var sequelize = require('../sequelize');

module.exports = sequelize.define('content', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: Sequelize.TINYINT(4),
    user_id: Sequelize.INTEGER,
    user_name: Sequelize.STRING(64),
    created: Sequelize.DATE,
    hidden: Sequelize.BOOLEAN,
    view: Sequelize.INTEGER,
    favor: Sequelize.INTEGER,
    content: Sequelize.TEXT
}, {
    timestamps: false
});

