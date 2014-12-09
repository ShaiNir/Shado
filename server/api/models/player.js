module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Player', {
        name: DataTypes.STRING, //Todo: validate sane for SQL/HTML
        defaultSalary: DataTypes.INTEGER,
        contractExpires: DataTypes.DATE,
        statsFeed: DataTypes.STRING,
        realWorldTeam: DataTypes.STRING //Todo: validate sane for SQL/HTML
    })
}
