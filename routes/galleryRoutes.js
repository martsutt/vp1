const express = require("express");
const router = express.Router(); // suur R on oluline
const general = require("../generalFnc");

// kõikidele marsuutidele ühine vahevara ( middleware)
router.use(general.checkLogin);

//kontrollerid
const {
  galleryOpenPage,
  galleryPage,
} = require("../controllers/galleryControllers");

//igale marsruudile oma osa nagu seni index failis

router.route("/").get(galleryOpenPage);

router.route("/:page").get(galleryPage);

module.exports = router;
