require("dotenv").config();
import { Bot } from "./bot";
let bot = new Bot();

bot
  .listen()
  .then(() => {
    console.log("Ready!");
  })
  .catch(error => {
    console.log("Error: ", error);
  });
