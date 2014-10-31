module.exports = function(sequelize, DataTypes) {
    return sequelize.define('LeagueSetting', {
        key: DataTypes.STRING,
        value: DataTypes.STRING
    })
}