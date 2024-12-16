const express = require("express");
const router = express.Router(); // suur R on oluline
const isLogin = require("../generalFnc");

// kõikidele marsuutidele ühine vahevara ( middleware)
router.use(isLogin.checkLogin);

const {
  eestifilm,
  tegelased,
  lisa,
  lisaseos,
} = require("../controllers/eestifilmController");

router.use(isLogin.checkLogin);

router.route("/").get(eestifilm);

router.route("/tegelased").get(tegelased);

router.route("/lisa").get(lisa);

router.route("/lisaseos").get(lisaseos);

module.exports = router;
