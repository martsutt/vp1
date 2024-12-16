const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");
const async = require("async");
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase,
});

const galleryOpenPage = (req, res) => {
  res.redirect("/thumbgallery/1");
};

const galleryPage = (req, res) => {
  let galleryLinks = "";
  let page = parseInt(req.params.page);
  if (page < 1) {
    page = 1;
  }
  const photoLimit = 5;
  //let skip = 10;
  let skip = 0;
  const privacy = 3;

  //teeme päringud, mida tuleb kindlalt üksteise järel teha
  const galleryPageTasks = [
    function (callback) {
      conn.execute(
        "SELECT COUNT(id) as photos FROM photos WHERE privacy = ? AND deleted IS NULL",
        [privacy],
        (err, result) => {
          if (err) {
            return callback(err);
          } else {
            return callback(null, result);
          }
        }
      );
    },
    function (photoCount, callback) {
      console.log("Fotosid on: " + photoCount[0].photos);
      console.log("Sellel lehel: " + page * photoLimit);
      if ((page - 1) * photoLimit >= photoCount[0].photos) {
        page = Math.ceil(photoCount[0].photos / photoLimit);
      }
      console.log("Lehekülg on: " + page);
      //lingid oleksid
      //<a href="/gallery/1">eelmine leht</a>  |  <a href="/gallery/3">järgmine leht</a>
      if (page == 1) {
        galleryLinks = "eelmine leht &nbsp;&nbsp;&nbsp;| &nbsp;&nbsp;&nbsp;";
      } else {
        galleryLinks =
          '<a href="/thumbgallery/' +
          (page - 1) +
          '"> eelmine leht</a> &nbsp;&nbsp;&nbsp;| &nbsp;&nbsp;&nbsp;';
      }
      if (page * photoLimit >= photoCount[0].photos) {
        galleryLinks += "järgmine leht";
      } else {
        galleryLinks +=
          '<a href="/thumbgallery/' + (page + 1) + '"> järgmine leht</a>';
      }
      return callback(null, page);
    },
  ];
  //async waterfall
  async.waterfall(galleryPageTasks, (err, results) => {
    if (err) {
      throw err;
    } else {
      console.log(results);
    }
  });
  //Kui aadressis toodud lk on muudetud, oli vigane, siis ...
  //console.log(req.params.page);
  /* if(page != parseInt(req.params.page)){
		console.log("LK muutus!!!");
		res.redirect("/gallery/" + page);
	} */
  skip = (page - 1) * photoLimit;
  let sqlReq =
    "SELECT file_name, alt_text FROM photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC LIMIT ?,?";

  let photoList = [];
  conn.execute(sqlReq, [privacy, skip, photoLimit], (err, result) => {
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
      res.render("thumbgallery", { listData: photoList, links: galleryLinks });
    }
  });
  //res.render("gallery");
};

module.exports = {
  galleryOpenPage,
  galleryPage,
};
