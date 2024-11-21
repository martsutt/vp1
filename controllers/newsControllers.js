const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const dtEt = require("../dateTime");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});
//#desc home page for news section
//#route GET /news
//#access_private

const newsHome = (req, res) => {
  console.log("Töötab uudiste router koos controlleriga :D");
  res.render("news");
};

//#desc page for adding news
//#route GET /news/addnews
//#access_private

const addNews = (req, res) => {
  // checkLogin oli siin
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
};

//#desc adding news
//#route POST /news/addnews
//#access_private

const addingNews = (req, res) => {
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
};

//#desc reading news
//#route GET /news/read
//#access_private

const readingNews = (req, res) => {
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

      res.render("read", { newsList, today });
    }
  });
};

module.exports = {
  newsHome,
  addNews,
  addingNews,
  readingNews,
};
