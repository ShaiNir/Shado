module.exports = function(sequelize, DataTypes) {
    return sequelize.define('LeagueEvent', {
        description: DataTypes.STRING,
        time: DataTypes.DATE,
        function: DataTypes.STRING,
        _parameters: DataTypes.STRING,
        status: {
            type: DataTypes.ENUM,
            values: ['pending', 'running', 'done', 'error']
        },
        retries: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    },{
        getterMethods: {
            params: function () {
                return JSON.parse(this._parameters);
            }
        },
        setterMethods: {
            params: function (p) {
                this._parameters = JSON.stringify(p);
            }
        }
    })
};