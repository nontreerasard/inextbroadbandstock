// filepath: /c:/Users/Admin/inext-stock/models/models.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fullname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const Stock = sequelize.define('Stock', {
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    borrowCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    borrower: {
        type: DataTypes.STRING,
        allowNull: true
    },
    borrowDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    returnDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = { User, Stock };