const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
//päringu lahtiharutamiseks POST päringute puhul
const bodyparser = require("body-parser");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu URL-i parsimine, false, kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({extended: false}));

app.get("/", (req,res)=>{
    res.render("index.ejs");
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

app.listen(5134);