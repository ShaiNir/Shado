module.exports = function(sequelize, DataTypes) {
    return sequelize.define('League', {
        name: DataTypes.STRING,//Todo: validate sane for SQL/HTML
        status: {
            type: DataTypes.ENUM,
            values: ['new', 'active', 'inactive']
        }
    })
}