const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
//päringu lahtiharutamiseks POST päringute puhul
const bodyparser = require("body-parser");
//failide üleslaadimiseks
const multer = require("multer");
//pildimanipulatsiooniks (suuruse muutmine)
const sharp = require("sharp");
const bcrypt = require("bcrypt");
//sessiooni haldur
const session = require("express-session");

const app = express();
app.use(session({ secret: "jänes", saveUninitialized: true, resave: true })); // see jura express session-i pärast. jänes :D
app.set("view engine", "ejs");
app.use(express.static("public")); //sellega saab server kataloogist asju
//app.use(bodyparser.urlencoded({ extended: false })); päringu URL-i parsimine, false, kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({ extended: true }));
//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
const upload = multer({ dest: "./public/gallery/orig/" });

//loon andmebaasi ühenduse  / sõna conn sõnast connection
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});

const checkLogin = function (req, res, next) {
  //vahevaral on next parameeter
  if (req.session != null) {
    if (req.session.userId) {
      console.log("Login, sees kasutaja: " + req.session.userId);
      next();
    } else {
      console.log("login not detected");
      res.redirect("/signin");
    }
  } else {
    console.log("session not detected");
    res.redirect("/signin");
  }
};

app.get("/", (req, res) => {
  const semestrist = dtEt.daysBetween();
  const sqlReq =
    "SELECT news_title, news_text, news_date FROM news ORDER BY news_date DESC LIMIT 1";
  conn.query(sqlReq, (err, results) => {
    if (err) {
      throw err;
    }
    const latestNews =
      results.length > 0
        ? {
            news_title: results[0].news_title,
            news_text: results[0].news_text,
            news_date: dtEt.givendateEt(results[0].news_date),
          }
        : null;
    let expirationDate = null;

    if (latestNews) {
      const newsDate = new Date(results[0].news_date);
      const expDate = new Date(newsDate);
      expDate.setDate(expDate.getDate() + 10);
      expirationDate = dtEt.givendateEt(expDate);
    }
    res.render("index.ejs", {
      semestrist,
      latestNews,
      expired: expirationDate,
    });
  });
});

app.get("/signup", (req, res) => {
  let notice = "";
  let firstNameValue = "";
  let lastNameValue = "";
  let email = "";
  res.render("signup", { notice, email, lastNameValue, firstNameValue });
});

app.post("/signup", (req, res) => {
  let notice = "Ootan andmeid!";
  console.log(req.body);

  if (
    !req.body.firstNameInput ||
    !req.body.lastNameInput ||
    !req.body.birthDateInput ||
    !req.body.genderInput ||
    !req.body.emailInput ||
    req.body.passwordInput.length < 8 ||
    req.body.passwordInput !== req.body.confirmPasswordInput
  ) {
    email = req.body.emailInput;
    firstNameValue = req.body.firstNameInput;
    lastNameValue = req.body.lastNameInput;
    console.log("ANDMEID ON PUUDU VÕI PAROOLID EI KATTU!!!");
    notice = "Andmeid on puudu, parool liiga lühike või paroolid ei kattu";
    res.render("signup", { notice: notice });
  } else {
    let idreq = "SELECT id FROM users WHERE email = ?";
    conn.query(idreq, [req.body.emailInput], (err, idres) => {
      if (err) {
        notice = "tehniline viga kasutajate vaatamisel";
        res.render("signup", { notice: notice });
      } else if (idres[0] != null) {
        notice = "kasutaja juba olemas";
        res.render("signup", { notice, email, lastNameValue, firstNameValue });
      } else {
        notice = "Andmed sisestatud"; // npm install bcrypt
        bcrypt.genSalt(10, (err, salt) => {
          // tegime soola
          if (err) {
            notice = "Tehniline viga, kasutajat ei loodud";
            res.render("signup", {
              notice,
              email,
              lastNameValue,
              firstNameValue,
            });
          } else {
            // krüpteerime
            bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash) => {
              // hash lõpeb
              if (err) {
                notice =
                  "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud";
                res.render("signup", {
                  notice,
                  email,
                  lastNameValue,
                  firstNameValue,
                });
              } else {
                let sqlReq =
                  "INSERT INTO users (first_name, last_name, birth_date, gender, email, password) VALUES (?,?,?,?,?,?)";
                conn.execute(
                  sqlReq,
                  [
                    req.body.firstNameInput,
                    req.body.lastNameInput,
                    req.body.birthDateInput,
                    req.body.genderInput,
                    req.body.emailInput,
                    pwdHash,
                  ],
                  (err, result) => {
                    if (err) {
                      notice =
                        "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud.";
                      res.render("signup", {
                        notice,
                        email,
                        lastNameValue,
                        firstNameValue,
                      });
                    } else {
                      notice =
                        "Kasutaja " + req.body.emailInput + " edukalt loodud!";
                      res.render("signup", {
                        notice,
                        email,
                        lastNameValue,
                        firstNameValue,
                      });
                    }
                  }
                ); // conn.execute lõpp
              }
            }); // genSalt lõppeb
          }
        }); // genSalt lõppeb
      }
    }); // conn.query lõpp
  } // kui andmed korras
}); // app.post lõpp

app.get("/timenow", (req, res) => {
  const dateNow = dtEt.dateEt();
  const timeNow = dtEt.kell();
  res.render("timenow", { nowD: dateNow, nowT: timeNow });
});

app.get("/vanasonad", (req, res) => {
  let folkWisdom = [];
  fs.readFile("public/txt/vanasonad.txt", "utf8", (err, data) => {
    if (err) {
      //throw err;
      res.render("justlist", {
        h2: "Vanasõnad",
        listData: ["Ei leidnud ühtegi vanasõna!"],
      });
    } else {
      folkWisdom = data.split(";");
      res.render("justlist", { h2: "Vanasõnad", listData: folkWisdom });
    }
  });
});

app.get("/visitlog", checkLogin, (req, res) => {
  let kulastajaNimekiri = [];
  fs.readFile("public/txt/visitlog.txt", "utf8", (err, data) => {
    if (err) {
      res.render("visitlog", {
        h2: "Külastajate nimekiri",
        listData: ["Ei leidnud külastajate andmeid"],
      });
    } else {
      kulastajaNimekiri = data.split(";");
      res.render("visitlog", {
        h2: "Külastajate nimekiri",
        listData: kulastajaNimekiri,
      });
    }
  });
});

app.get("/visitlogdb", checkLogin, (req, res) => {
  let sqlReq = "SELECT first_name, last_name, visit_time FROM visitlog";
  let visits = [];
  conn.query(sqlReq, (err, sqlres) => {
    if (err) {
      throw err;
    } else {
      console.log(sqlres);
      visits = sqlres;
      res.render("visitlogdb", { visits: visits });
    }
  });
});

app.get("/regvisit", checkLogin, (req, res) => {
  res.render("regvisit");
});

app.post("/regvisit", (req, res) => {
  console.log(req.body);
  fs.open("public/txt/visitlog.txt", "a", (err, file) => {
    if (err) {
      throw err;
    } else {
      fs.appendFile(
        "public/txt/visitlog.txt",
        "Nimi: " +
          req.body.firstNameInput +
          " " +
          req.body.lastNameInput +
          ";" +
          "Aeg: " +
          dtEt.dateEt() +
          " " +
          dtEt.kell() +
          ";",
        (err) => {
          if (err) {
            throw err;
          } else {
            console.log("Faili kirjutati");
            res.render("regvisit");
          }
        }
      );
    }
  });
});

app.get("/regvisitdb", checkLogin, (req, res) => {
  let notice = "";
  let firstName = "";
  let lastName = "";
  res.render("regvisitdb", {
    notice: notice,
    firstName: firstName,
    lastName: lastName,
  });
});

app.post("/regvisitdb", (req, res) => {
  let notice = "";
  let firstName = "";
  let lastName = "";
  if (!req.body.firstNameInput || !req.body.lastNameInput) {
    firstName = req.body.firstNameInput;
    lastName = req.body.lastNameInput;
    notice = "Osa andmeid sisestamata";
    res.render("regvisitdb", {
      notice: notice,
      firstName: firstName,
      lastName: lastName,
    });
  } else {
    let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES (?,?)";
    conn.query(
      sqlreq,
      [req.body.firstNameInput, req.body.lastNameInput],
      (err, sqlres) => {
        if (err) {
          throw err;
        } else {
          notice = "Külastus registreeritud!";
          res.render("regvisitdb", {
            notice: notice,
            firstName: firstName,
            lastName: lastName,
          });
        }
      }
    );
  }
});

// uudiste osa eraldi
const newsRouter = require("./routes/newsRoutes");
app.use("/news", newsRouter);
// NEED 2 RIDA NÜÜD ASENDAVAD KOGU UUDISTE COMMENTITUD OSA
//eesti filmi osa eraldi marsruutide failiga
const eestifilmRouter = require("./routes/eestifilmRoutes");
app.use("/eestifilm", eestifilmRouter);
const photoupRouter = require("./routes/photouploadRoutes");
app.use("/photoupload", photoupRouter);
const galleryRouter = require("./routes/galleryRoutes");
app.use("/thumbgallery", galleryRouter);
//eesti filmi osa eraldi marsruutide failiga
const signinRouter = require("./routes/signinRoutes");
app.use("/signin", signinRouter);

app.get("/eestifilm/filmiandmetelisamine", (req, res) => {
  let notice = "";
  res.render("filmiandmetelisamine", { notice });
});

app.get("/add_movie", (req, res) => {
  let notice = "";
  let title = "";
  let productionYear = "";
  let duration = "";
  let description = "";
  res.render("filmiandmetelisamine", {
    notice,
    title,
    productionYear,
    duration,
    description,
  });
});

app.get("/add_position", (req, res) => {
  let notice = "";
  let positionName = "";
  let description = "";
  res.render("filmiandmetelisamine", { notice, positionName, description });
});

app.post("/add_position", (req, res) => {
  let notice = "";
  let positionName = req.body.position_name;
  let description = req.body.description;

  if (!positionName) {
    notice = "Andmeid on puudu";
    return res.render("filmiandmetelisamine", { notice, positionName });
  } else {
    let sqlreq =
      "INSERT INTO `position` (position_name, description) VALUES (?, ?)";
    conn.query(sqlreq, [positionName, description], (err) => {
      if (err) {
        console.log("position:", positionName);
        console.log("Description:", description);
        throw err;
      } else {
        notice = "Roll edukalt lisatud";
        res.render("filmiandmetelisamine", {
          notice,
          positionName: "",
          description: "",
        });
      }
    });
  }
});

app.post("/add_person", (req, res) => {
  let notice = "";
  let firstName = req.body.first_name;
  let lastName = req.body.last_name;
  let birthDate = req.body.birth_date;

  if (!firstName || !lastName || !birthDate) {
    notice = "Andmeid on puudu";
    res.render("filmiandmetelisamine", {
      notice,
      firstName,
      lastName,
      birthDate,
    });
  } else {
    let sqlreq =
      "INSERT INTO person (first_name, last_name, birth_date) VALUES (?, ?, ?)";
    conn.query(sqlreq, [firstName, lastName, birthDate], (err) => {
      if (err) {
        throw err;
      } else {
        notice = "Tegelane edukalt lisatud";
        res.render("filmiandmetelisamine", {
          notice,
          firstName: "",
          lastName: "",
          birthDate: "",
        });
      }
    });
  }
});

app.post("/add_movie", (req, res) => {
  let notice = "";
  let title = req.body.title;
  let productionYear = req.body.production_year;
  let duration = req.body.duration;
  let description = req.body.description;

  if (!title || !productionYear || !duration || !description) {
    notice = "Andmeid on puudu";
    res.render("filmiandmetelisamine", {
      notice,
      title,
      productionYear,
      duration,
      description,
    });
  } else {
    let sqlreq =
      "INSERT INTO movie (title, production_year, duration, description) VALUES (?, ?, ?, ?)";
    conn.query(
      sqlreq,
      [title, productionYear, duration, description],
      (err) => {
        if (err) {
          throw err;
        } else {
          notice = "Film edukalt lisatud";
          res.render("filmiandmetelisamine", {
            notice,
            title: "",
            productionYear: "",
            duration: "",
            description: "",
          });
        }
      }
    );
  }
});

app.get("/home", checkLogin, (req, res) => {
  console.log("Sees on kasutaja: " + req.session.userId);
  const semestrist = dtEt.daysBetween();
  const sqlReq =
    "SELECT news_title, news_text, news_date FROM news ORDER BY news_date DESC LIMIT 1";
  conn.query(sqlReq, (err, results) => {
    if (err) {
      throw err;
    }
    const latestNews =
      results.length > 0
        ? {
            news_title: results[0].news_title,
            news_text: results[0].news_text,
            news_date: dtEt.givendateEt(results[0].news_date),
          }
        : null;
    let expirationDate = null;

    if (latestNews) {
      const newsDate = new Date(results[0].news_date);
      const expDate = new Date(newsDate);
      expDate.setDate(expDate.getDate() + 10);
      expirationDate = dtEt.givendateEt(expDate);
    }
    res.render("home", {
      semestrist,
      latestNews,
      expired: expirationDate,
    });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  console.log("Välja logitud");
  res.redirect("/");
});

app.listen(5134);
