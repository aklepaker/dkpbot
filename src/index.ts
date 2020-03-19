require("dotenv").config();
import { Bot } from "./bot";
let bot = new Bot();

bot
  .listen()
  .then(() => {
    console.log("Initialize OK, listening for requests");
  })
  .catch(error => {
    console.log("Error: ", error);
  });
