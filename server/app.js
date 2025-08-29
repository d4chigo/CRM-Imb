const express = require("express");
const config = require("./config/config");

const app = express();

app.set("port", config.port);

module.exports = app;