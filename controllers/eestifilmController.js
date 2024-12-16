const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const dtEt = require("../dateTime");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});

const async = require("async");

const eestifilm = (req, res) => {
  console.log("Sees on kasutaja: " + req.session.userId);
  res.render("filmindex");
};

const tegelased = (req, res) => {
  //persons = sqlres; selle asemel tee hoopis nii: , for   i algab 0 piiriks sqlres.length , tsükli sees lisame persons listile uue elemendi, mis on ise "objekt" {first_name: sqlres[i].first_name} , listi lisamiseks on käsk push.persons(lisatav element);
  let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
  let persons = [];
  conn.query(sqlReq, (err, sqlres) => {
    if (err) {
      throw err;
    } else {
      console.log(sqlres);
      for (let i = 0; i < sqlres.length; i++) {
        persons.push({
          first_name: sqlres[i].first_name,
          last_name: sqlres[i].last_name,
          birth_date: dtEt.givendateEt(sqlres[i].birth_date),
        });
      }
      res.render("tegelased", { persons: persons });
    }
  });
};

const lisa = (req, res) => {
  let notice = "";
  let firstName = "";
  let lastName = "";
  let birthDate = "";
  res.render("filmiandmetelisamine", {
    notice,
    firstName,
    lastName,
    birthDate,
  });
};

const lisaseos = (req, res) => {
  // võtan kasutusele async mooduli et korraga teha mitu andmebaasipäringut
  const filmQueries = [
    function (callback) {
      let sqlReq1 = "SELECT id, first_name, last_name, birth_date FROM person";
      conn.execute(sqlReq1, (err, result) => {
        if (err) {
          return callback(err);
        } else {
          return callback(null, result);
        }
      });
    }, // KOMA KUNA PLAAN ULES LUGEDAK OIK 3 ASJA JARJEST KORRAGA
    function (callback) {
      let sqlReq2 = "SELECT id, title, production_year FROM movie";
      conn.execute(sqlReq2, (err, result) => {
        if (err) {
          return callback(err);
        } else {
          return callback(null, result);
        }
      });
    },
    function (callback) {
      let sqlReq3 = "SELECT id, position_name FROM position";
      conn.execute(sqlReq3, (err, result) => {
        if (err) {
          return callback(err);
        } else {
          return callback(null, result);
        }
      });
    },
  ];
  // paneme päringud/funktsioonid paralleelselt käima, tulemuseks saame 3 päringu koondi
  async.parallel(filmQueries, (err, results) => {
    if (err) {
      throw err;
    } else {
      console.log(results);
      res.render("addrelations", {
        personList: results[0],
        movieList: results[1],
        positionList: results[2],
      });
    }
  });
};

module.exports = {
  eestifilm,
  tegelased,
  lisa,
  lisaseos,
};
