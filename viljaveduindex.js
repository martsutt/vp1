const express = require("express");
const fs = require("fs");
const async = require("async");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});
const session = require("express-session");
const app = express();
app.set("view engine", "ejs");
const bodyparser = require("body-parser");
app.use(bodyparser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("viljaveduindex.ejs");
});

app.get("/viljaveoandmed", (req, res) => {
  let notice = "";
  let truck = "";
  let weight_in = "";
  let weight_out = "";
  return res.render("viljaveoandmed", {
    notice,
    truck,
    weight_in,
    weight_out,
  });
});

app.post("/viljaveoandmed", (req, res) => {
  let notice = "";
  let truck = req.body.truck;
  let weight_in = req.body.weight_in;
  let weight_out = req.body.weight_out;

  if (!truck || !weight_in) {
    notice = "Andmeid on puudu";
    return res.render("viljaveoandmed", {
      notice,
      truck,
      weight_in,
      weight_out,
    });
  } else {
    let sqlreq =
      "INSERT INTO viljavedu (truck, weight_in, weight_out) VALUES (?, ?, ?)";
    conn.query(sqlreq, [truck, weight_in, weight_out], (err) => {
      if (err) {
        throw err;
      } else {
        notice = "Viljaveo andmed edukalt lisatud";
        return res.render("viljaveoandmed", {
          notice,
          truck: "",
          weight_in: "",
          weight_out: "",
        });
      }
    });
  }
});

app.get("/viljaveokokkuvote", (req, res) => {
  let sqlReq = "SELECT truck, weight_in, weight_out FROM viljavedu";
  let trucks = [];
  conn.query(sqlReq, (err, sqlres) => {
    if (err) {
      throw err;
    } else {
      console.log(sqlres);
      for (let i = 0; i < sqlres.length; i++) {
        trucks.push({
          truck: sqlres[i].truck,
          weight_in: sqlres[i].weight_in,
          weight_out: sqlres[i].weight_out,
          viljamass: sqlres[i].weight_in - sqlres[i].weight_out,
        });
      }
      res.render("viljaveokokkuvote", { trucks: trucks });
    }
  });
});

app.listen(5134);
