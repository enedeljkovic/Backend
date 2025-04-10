const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');


const sequelize = new Sequelize('InstaRecipe', 'postgres', 'fdg5ahee', {
  host: 'localhost',
  dialect: 'postgres',
});


const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  hooks: {
    
    beforeSave: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});


User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};


sequelize.sync()
  .then(() => console.log('Korisnici model je uspješno sinhroniziran s bazom'))
  .catch((error) => console.error('Greška pri sinhronizaciji modela:', error));

module.exports = User;
