module.exports = function(sequelize, DataTypes) {
    return sequelize.define('TransactionApproval', {
        status: {
            type: DataTypes.ENUM,
            values: ['pending', 'approved', 'rejected']
        },
        role: {
            type: DataTypes.ENUM,
            values: ['participant', 'commish']
        }
    })
}