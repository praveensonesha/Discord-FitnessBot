// dbConfig.js
module.exports = {
  fitness_coach: {
    host: process.env.DB_HOST_1,
    user: process.env.DB_USERNAME_1,
    password: process.env.DB_PASS_1,
    database: process.env.DB_NAME_1,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  cube_club: {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'cube_club',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
//   cube_club: {
//   host: process.env.DB_HOST_2,
//   user: process.env.DB_USERNAME_2,
//   password: process.env.DB_PASS_2,
//   database: process.env.DB_NAME_2,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
//   }    
};
