const express = require("express");
const router = express.Router(); // suur R on oluline
const general = require("../generalFnc");

// kõikidele marsuutidele ühine vahevara ( middleware)
router.use(general.checkLogin);

//kontrollerid
const {
  newsHome,
  addNews,
  addingNews,
  readingNews,
} = require("../controllers/newsControllers");

// igale marsuudile oma osa nagu seni index failis

//app.get("/news", (req, res) => {
router.route("/").get(newsHome);

router.route("/addnews").get(addNews);

router.route("/addnews").post(addingNews);

router.route("/read").get(readingNews);

module.exports = router;
