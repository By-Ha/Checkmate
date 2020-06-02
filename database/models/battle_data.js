var Sequelize = require('sequelize');
var sequelize = require('../sequelize');

module.exports = sequelize.define('battle_data', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    battle_id: Sequelize.STRING(65),
    time: Sequelize.DATE,
    battle_data: Sequelize.TEXT('medium'),
}, {
    timestamps: false
});
