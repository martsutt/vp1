const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const fs = require("fs");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});

const sharp = require("sharp");

const photouploadPage = (req, res) => {
  let notice = "";
  res.render("photoupload", { notice: notice });
};

const photouploading = (req, res) => {
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
      req.file.originalname,
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
};

module.exports = {
  photouploadPage,
  photouploading,
};
