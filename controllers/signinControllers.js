const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});
const bcrypt = require("bcrypt");

const signinPage = (req, res) => {
  res.render("signin");
};

const signingin = (req, res) => {
  let notice = "";
  if (!req.body.emailInput || !req.body.passwordInput) {
    console.log("andmeid puudu");
    notice = "sisselogimise andmeid on puudu";
    //const semestrist = dtEt.semester("9-2-2024");
    res.render("signin", { notice: notice });
  } else {
    let sqlReq = "SELECT id, password FROM users WHERE email = ?";
    conn.execute(sqlReq, [req.body.emailInput], (err, result) => {
      if (err) {
        console.log("viga andmebaasist lugemisel");
        notice = "tehniline viga, ei logitud sisse :(";
        res.render("signin", { notice: notice });
      } else {
        if (result[0] != null) {
          //juhul kui kasutaja on olemas ->
          //kontrollime sisestatud parooli ->
          bcrypt.compare(
            req.body.passwordInput,
            result[0].password,
            (err, compareResult) => {
              if (err) {
                notice = "tehniline viga, ei logitud sisse :(";
                res.render("signin", { notice: notice });
              } else {
                //kas võrdlemisel õige või vale parool?? ->
                if (compareResult) {
                  //notice = "Oled sisse loginud";
                  console.log(
                    "Kasutaja " + req.body.emailInput + " on sisse logitud"
                  );
                  //res.render("signin", { notice });
                  req.session.userId = result[0].id;
                  res.redirect("/home");
                } else {
                  notice = "kasutajatunnus ja/või parool on vale";
                  res.render("signin", { notice });
                }
              }
            }
          );
        } else {
          console.log("kasutajat ei ole olemas");
          notice = "kasutajatunnus ja/või parool on vale";
          res.render("signin", { notice });
        }
      }
    }); //conn.execute...lõppeb
  }
};

module.exports = {
  signinPage,
  signingin,
};
