/**
 * Created by shai on 11/5/14.
 */
module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Message', {
        _parameters: DataTypes.TEXT,
        type: DataTypes.STRING
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