module.exports = function(sequelize, DataTypes) {
    return sequelize.define('League', {
        name: DataTypes.STRING,
        status: {
            type: DataTypes.ENUM,
            values: ['new', 'active', 'inactive']
        }
    })
}