module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Player', {
        name: DataTypes.STRING,
        defaultSalary: DataTypes.INTEGER,
        contractExpires: DataTypes.DATE,
        statsFeed: DataTypes.STRING,
        realWorldTeam: DataTypes.STRING
    })
}
