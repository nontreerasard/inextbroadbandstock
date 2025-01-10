// filepath: /c:/Users/Admin/inext-stock/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('inext_stock', 'root', '16112544', {
    host: 'localhost',
    dialect: 'mysql'
});

module.exports = sequelize;