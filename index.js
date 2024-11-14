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

app.get("/eestifilm", checkLogin, (req, res) => {
  res.render("filmindex");
});

app.get("/eestifilm/tegelased", (req, res) => {
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
});

app.get("/addnews", checkLogin, (req, res) => {
  let newsTitle = "";
  let newsText = "";
  let expired = "";
  let notice = "";
  const dateNow = dtEt.dateEt();
  const timeNow = dtEt.kell();
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + 10);
  const formattedExpDate = dtEt.givendateEt(expDate);
  res.render("addnews", {
    nowD: dateNow,
    nowT: timeNow,
    expired: formattedExpDate,
    notice,
  });
});

app.post("/addnews", (req, res) => {
  let newsTitle = req.body.title;
  let newsText = req.body.newsInput;
  let expired = req.body.expireInput;
  let user = 1;

  if (!newsTitle || newsTitle.length < 3) {
    let notice = "Uudise pealkiri peab olema vähemalt 3 tähemärki!";
    return res.render("addnews", { newsTitle, newsText, expired, notice });
  }
  if (!newsText || newsText.length < 10) {
    let notice = "Uudise sisu peab olema vähemalt 10 tähemärki!";
    return res.render("addnews", { newsTitle, newsText, expired, notice });
  }

  if (!newsTitle || !newsText || !expired) {
    let notice = "Osa andmeid on sisestamata!";
    res.render("addnews", { newsTitle, newsText, expired, notice });
  } else {
    let sqlreq =
      "INSERT INTO news (news_title, news_text, expire_date, user_id) VALUES (?, ?, ?, ?)";
    conn.query(sqlreq, [newsTitle, newsText, expired, user], (err) => {
      if (err) {
        throw err;
      } else {
        let notice = "Uudis salvestatud!";
        res.render("addnews", {
          newsTitle: "",
          newsText: "",
          expired: "",
          notice,
        });
      }
    });
  }
});

app.get("/news", (req, res) => {
  const today = dtEt.dateEt();
  let newsList = [];
  let sqlReq =
    "SELECT news_title, news_text, news_date, expire_date FROM news WHERE expire_date >= 1 ORDER BY id DESC";
  const formattedDate = dtEt.sqlDateEt();
  conn.query(sqlReq, [formattedDate], (err, results) => {
    if (err) {
      throw err;
    } else {
      let newsList = results.map((item) => ({
        news_title: item.news_title,
        news_text: item.news_text,
        news_date: dtEt.givendateEt(item.news_date),
      }));

      res.render("news", { newsList, today });
    }
  });
});

app.get("/eestifilm/filmiandmetelisamine", (req, res) => {
  let notice = "";
  res.render("filmiandmetelisamine", { notice });
});

app.get("/add_person", (req, res) => {
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

app.get("/photoupload", checkLogin, (req, res) => {
  let notice = "";
  res.render("photoupload", { notice: notice });
});

app.post("/photoupload", upload.single("photoInput"), (req, res) => {
  //ehk photo input ist tulnud info suunatakse multerile ja multer teab kuhu seda panna
  let notice = "";
  if (!req.file) {
    notice = "Palun vali pilt";
    console.log(notice);
    return res.render("photoupload", { notice: notice });
  }
  const validMimeTypes = ["image/jpeg"]; //"image/png", "image/gif"

  if (!validMimeTypes.includes(req.file.mimetype)) {
    notice = "Palun vali pilt ( ainult .jpg failid )";
    console.log(notice);
    return res.render("photoupload", { notice: notice });
  }
  console.log(req.body);
  // sellega sai   photoInput: 'T1_ratas.jpg', altInput: 't1 ratas', privacyInput: '1', photoSubmit: 'Lae pilt üles' konsooli kui pildi submit isid
  console.log(req.file);
  //failiinfo konsooli saamiseks
  const fileName = "vp_" + Date.now() + ".jpg";
  //genereerime oma faili nime ( teeme natuke halvasti kuna jatame ainult jpg) me teeme vp_ ajatempel + .jpg
  fs.rename(req.file.path, req.file.destination + fileName, (err) => {
    if (err) {
      console.log(err);
      return res.render("photoupload", {
        notice: "Pildi üleslaadimisel tekkis viga.",
      });
    }
  });
  //nimeta üleslaetud faili ümber just meie tehtud fileNamega
  //console.log("jpg faili uus nimi on: ", fileName)   //siin testisin niisama kuidas konsoolis valjastada failinime peale muutmist
  sharp(req.file.destination + fileName)
    .resize(800, 600)
    .jpeg({ quality: 90 })
    .toFile("./public/gallery/normal/" + fileName, (err) => {
      if (err) {
        console.log(err);
        return res.render("photoupload", {
          notice: "Pildi töötlemisel tekkis viga.",
        });
      }
    });
  //node js image manipulation google naiteks et meil on vaja uut moodulit et teha eri suurustes ja formaatides pilte (aint jpg still) kasutame moodulit sharp
  //praegu loigatakse pildiservad ara, tulevikus vaattame kuidas teise lõikeid teha nagu crop
  //pakkimise kvaliteedi 1-100 ranges 90 peale ja suunasime talle koha kuhu panna ja liita fileName mis enne tegime
  sharp(req.file.destination + fileName)
    .resize(100, 100)
    .jpeg({ quality: 90 })
    .toFile("./public/gallery/thumb/" + fileName, (err) => {
      if (err) {
        console.log(err);
        return res.render("photoupload", {
          notice: "Pildi töötlemisel tekkis viga.",
        });
      }
    });
  //sama thumbnail i omaga
  let sqlreq =
    "INSERT INTO photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?, ?, ?, ?, ?)"; //salvestame andmebaasi nüüd
  const userId = 1;
  conn.query(
    sqlreq,
    [
      fileName,
      req.file.originalName,
      req.body.altInput,
      req.body.privacyInput,
      userId,
    ],
    (err, result) => {
      if (err) {
        throw err;
      } else {
        notice = "Pilt edukalt üles laetud";
        console.log("Pilt üles laetud andmebaasi");
        res.render("photoupload", { notice: notice });
      }
    }
  );
  //res.render("photoupload");
});

app.get("/thumbgallery", (req, res) => {
  let sqlReq =
    "SELECT file_name, alt_text FROM photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC";
  const privacy = 3;
  let photoList = [];
  conn.query(sqlReq, [privacy], (err, result) => {
    if (err) {
      throw err;
    } else {
      console.log(result);
      for (let i = 0; i < result.length; i++) {
        photoList.push({
          href: "/gallery/thumb/" + result[i].file_name,
          alt: result[i].alt_text,
          fileName: result[i].file_name,
        });
      }
      res.render("thumbgallery", { listData: photoList });
    }
  });
  //res.render("gallery");
});

app.get("/signin", (req, res) => {
  res.render("signin");
});
app.post("/signin", (req, res) => {
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
