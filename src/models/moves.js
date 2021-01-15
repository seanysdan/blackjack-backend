const { Sequelize } = require("sequelize");
const db = require("../db");

const Move = db.define("move", {
  action: {
    type: Sequelize.STRING,
  },
  details: {
    type: Sequelize.STRING,
  },
});

Move.associate = (models) => {
  Move.belongsTo(models.User);
  Move.belongsTo(models.Game);
};

module.exports = Move;
