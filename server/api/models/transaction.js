module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Transaction', {
        type: {
            type: DataTypes.ENUM,
            values: ['trade', 'freeagent', 'draft']
        },
        status: {
            type: DataTypes.ENUM,
            values: ['pending','completed','rejected']
        },
        statusMessage: DataTypes.STRING
    })
}