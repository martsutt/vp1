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

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu URL-i parsimine, false, kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({extended: true}));
//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
const upload = multer({dest:"./public/gallery/orig/"})

//loon andmebaasi ühenduse  / sõna conn sõnast connection
const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.passWord,
    database: dbInfo.configData.dataBase
});


app.get("/", (req,res)=>{
    const semestrist = dtEt.daysBetween();
    const sqlReq = "SELECT news_title, news_text, news_date FROM news ORDER BY news_date DESC LIMIT 1";
    conn.query(sqlReq, (err, results) => {
        if (err) {
            throw err;
        }
        const latestNews = results.length > 0 ? {
            news_title: results[0].news_title,
            news_text: results[0].news_text,
            news_date: dtEt.givendateEt(results[0].news_date)
        } : null;
        let expirationDate = null;

        if (latestNews) {
            const newsDate = new Date(results[0].news_date);
            const expDate = new Date(newsDate);
            expDate.setDate(expDate.getDate() + 10);
            expirationDate = dtEt.givendateEt(expDate);
        }
        res.render("index.ejs", {semestrist, latestNews, expired: expirationDate });
    });
});

app.get("/timenow", (req,res)=>{
    const dateNow = dtEt.dateEt();
    const timeNow = dtEt.kell();
    res.render("timenow", {nowD: dateNow, nowT: timeNow});
});

app.get("/vanasonad", (req,res)=>{
    let folkWisdom = [];
    fs.readFile("public/txt/vanasonad.txt", "utf8", (err, data)=>{
        if (err){
            //throw err;
            res.render("justlist", {h2: "Vanasõnad", listData: ["Ei leidnud ühtegi vanasõna!"]});
        }
        else {
            folkWisdom = data.split(";");
            res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
        }
    });
});

app.get("/visitlog", (req,res)=>{
    let kulastajaNimekiri = []
    fs.readFile("public/txt/visitlog.txt", "utf8", (err, data)=>{
        if(err){
            res.render("visitlog", {h2: "Külastajate nimekiri", listData: ["Ei leidnud külastajate andmeid"]})
        }
        else {
            kulastajaNimekiri = data.split(";");
            res.render("visitlog", {h2: "Külastajate nimekiri", listData: kulastajaNimekiri});
        }
    });
});

app.get("/visitlogdb", (req, res) => {
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

app.get("/regvisit", (req,res)=>{
    res.render("regvisit");
});

app.post("/regvisit", (req,res)=>{
    console.log(req.body);
    fs.open("public/txt/visitlog.txt", "a", (err,file)=>{
        if(err){
            throw err;
        }
        else {
            fs.appendFile("public/txt/visitlog.txt",
                "Nimi: " + req.body.firstNameInput + " " + req.body.lastNameInput + ";" + 
                "Aeg: " + dtEt.dateEt() + " " + dtEt.kell() + ";" , 
                (err)=>{
                if(err){
                    throw err;
                }
                else {
                    console.log("Faili kirjutati");
                    res.render("regvisit");
                }
                });
            };
        });
    });

app.get("/regvisitdb", (req,res)=>{
    let notice = "";
    let firstName = "";
    let lastName = "";
    res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName}
    );
});

app.post("/regvisitdb", (req,res)=>{
    let notice = "";
    let firstName = "";
    let lastName = "";
    if(!req.body.firstNameInput || !req.body.lastNameInput){
        firstName = req.body.firstNameInput;
        lastName = req.body.lastNameInput;
        notice = "Osa andmeid sisestamata";
        res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
    }
    else{
        let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES (?,?)";
        conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err,sqlres)=>{
            if(err){
                throw err;
            }
            else{
                notice = "Külastus registreeritud!";
                res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
            }
        });
    }
});

app.get("/eestifilm", (req,res)=>{
        res.render("filmindex");
});

app.get("/eestifilm/tegelased", (req,res)=>{
    let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
    let persons = [];
    conn.query(sqlReq, (err, sqlres)=>{
        if(err){
            throw err;
        }
        else{
            console.log(sqlres);
            for (let i = 0; i<sqlres.length; i++){
                persons.push({
                    first_name: sqlres[i].first_name,
                    last_name: sqlres[i].last_name,
                    birth_date: dtEt.givendateEt(sqlres[i].birth_date)
                })
            }
            res.render("tegelased", {persons: persons});
        }
    });
});
            //persons = sqlres; selle asemel tee hoopis nii:
            //for   i algab 0 piiriks sqlres.length
            //tsükli sees lisame persons listile uue elemendi, mis on ise "objekt" {first_name: sqlres[i].first_name}
            //listi lisamiseks on käks
            //push.persons(lisatav element);

app.get("/addnews", (req,res)=>{
    let newsTitle = "";
    let newsText = "";
    let expired = "";
    let notice = "";
    const dateNow = dtEt.dateEt();
    const timeNow = dtEt.kell();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 10);
    const formattedExpDate = dtEt.givendateEt(expDate);
    res.render("addnews", { nowD: dateNow, nowT: timeNow, expired: formattedExpDate, notice });
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
        res.render("addnews", {newsTitle, newsText, expired, notice});
    } else {
        let sqlreq = "INSERT INTO news (news_title, news_text, expire_date, user_id) VALUES (?, ?, ?, ?)";
        conn.query(sqlreq, [newsTitle, newsText, expired, user], (err) => {
            if (err) {
                throw err;
            } else {
                let notice = "Uudis salvestatud!";
                res.render("addnews", {newsTitle: "", newsText: "", expired: "", notice});
            }
        });
    }
});

app.get("/news", (req, res) => {
    const today = dtEt.dateEt();
    let newsList = [];
    let sqlReq = "SELECT news_title, news_text, news_date, expire_date FROM news WHERE expire_date >= 1 ORDER BY id DESC";
    const formattedDate = dtEt.sqlDateEt();
    conn.query(sqlReq, [formattedDate], (err, results) => {
        if (err) {
            throw err;
        } else {
            let newsList = results.map(item => ({
                news_title: item.news_title,
                news_text: item.news_text,
                news_date: dtEt.givendateEt(item.news_date)
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
    res.render("filmiandmetelisamine", {notice, firstName, lastName, birthDate });
});

app.get("/add_movie", (req, res) => {
    let notice = "";
    let title = "";
    let productionYear = "";
    let duration = "";
    let description = "";
    res.render("filmiandmetelisamine", {notice, title, productionYear, duration, description});
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
    }
    else {
        let sqlreq = "INSERT INTO `position` (position_name, description) VALUES (?, ?)";
        conn.query(sqlreq, [positionName, description], (err) => {
            if(err){
                console.log("position:", positionName);
                console.log("Description:", description);
                throw err;
            }
            else{
                notice = "Roll edukalt lisatud";
                res.render("filmiandmetelisamine", { notice, positionName: "", description: "" });
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
        res.render("filmiandmetelisamine", { notice, firstName, lastName, birthDate });
    } else {
        let sqlreq = "INSERT INTO person (first_name, last_name, birth_date) VALUES (?, ?, ?)";
        conn.query(sqlreq, [firstName, lastName, birthDate], (err) => {
            if(err){
                throw err;
            }
            else{
                notice = "Tegelane edukalt lisatud";
                res.render("filmiandmetelisamine", { notice, firstName: "", lastName: "", birthDate: "" });
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
        res.render("filmiandmetelisamine", { notice, title, productionYear, duration, description });
    } else {
        let sqlreq = "INSERT INTO movie (title, production_year, duration, description) VALUES (?, ?, ?, ?)";
        conn.query(sqlreq, [title, productionYear, duration, description], (err) => {
            if(err){
                throw err;
            }else{
                notice = "Film edukalt lisatud";
                res.render("filmiandmetelisamine", { notice, title: "", productionYear: "", duration: "", description: "" });
            }
        });
    }
});

app.get("/photoupload", (req,res)=>{
    res.render("photoupload");
});

app.post("/photoupload", upload.single("photoInput"),(req,res)=>{
    //ehk photoinputist tulnud info suunatakse multerile ja multer teab kuhu seda panna
    console.log(req.body);
    // sellega sai   photoInput: 'T1_ratas.jpg', altInput: 't1 ratas', privacyInput: '1', photoSubmit: 'Lae pilt üles' konsooli kui pildi submittisid
    console.log(req.file);
    //failiinfo konsooli saamiseks
    const fileName = "vp_" + Date.now() + ".jpg";
    //genereerime oma faili nime ( teeme natuke halvasti kuna jatame ainult jpg) me teeme vp_ ajatempel + .jpg
    fs.rename(req.file.path, req.file.destination + fileName, (err)=>{
        console.log(err);
    })
    //nimeta üleslaetud faili ümber just meie tehtud fileNamega
    //console.log("jpg faili uus nimi on: ", fileName)   //siin testisin niisama kuidas konsoolis valjastada failinime peale muutmist
    sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
    //node js image manipulation google naiteks et meil on vaja uut moodulit et teha eri suurustes ja formaatides pilte (aint jpg still) kasutame moodulit sharp
    //praegu loigatakse pildiservad ara, tulevikus vaattame kuidas teise loikeid teha nagu crop
    //pakkimise kvaliteedi 1-100 ranges 90 peale ja suunasime talle koha kuhu panna ja liita fileName mis enne tegime
    sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
    //sama thumbnaili omaga
    let sqlreq =  "INSERT INTO photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?, ?, ?, ?, ?)"; //salvestame andmebaasi nüüd
    const userId = 1;
    conn.query(sqlreq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
        if(err) {
            throw err;
        } else {
            res.render("photoupload");
    }})
    //res.render("photoupload");
});

app.listen(5134);