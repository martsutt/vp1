const express = require("express");
const router = express.Router(); // suur R on oluline

//kontrollerid
const { signinPage, signingin } = require("../controllers/signinControllers");

router.route("/").get(signinPage);

router.route("/").post(signingin);

module.exports = router;
