var Sequelize = require('sequelize');
var sequelize = require('../sequelize');

module.exports = sequelize.define('battle', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    battle_id: Sequelize.STRING(65),
    time: Sequelize.DATE,
    player: Sequelize.INTEGER,
    rating: Sequelize.INTEGER,
    delta_rating: Sequelize.INTEGER
}, {
    timestamps: false
});
