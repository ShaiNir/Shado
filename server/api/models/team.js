module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Team', {
        name: DataTypes.STRING,
        budget: DataTypes.INTEGER,
        latlong: DataTypes.STRING,
        special: {
            // 'draft', 'waiver', and 'freeagency' are virtual teams that each league has for transaction purposes.
            // 'commish' is the "team" each league has to represent its commissioners for  transaction approvals, etc.
            type: DataTypes.ENUM,
            values: ['commish','draft', 'freeagency', 'waiver']
        }
    })
}