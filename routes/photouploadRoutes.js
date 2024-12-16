const express = require("express");
const router = express.Router(); // suur R on oluline
const general = require("../generalFnc");
//failide üleslaadimiseks
const multer = require("multer");
//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
const upload = multer({ dest: "./public/gallery/orig/" });

// kõikidele marsuutidele ühine vahevara ( middleware)
router.use(general.checkLogin);

//kontrollerid
const {
  photouploadPage,
  photouploading,
} = require("../controllers/photoupControllers");

router.route("/").get(photouploadPage);

router.route("/").post(upload.single("photoInput"), photouploading);

module.exports = router;
