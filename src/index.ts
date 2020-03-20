require("dotenv").config();
import { Bot } from "./classes/Bot";
const bot = new Bot();

bot
  .listen()
  .then(() => {
    console.log("Initialize OK, listening for requests");
  })
  .catch(error => {
    console.error("Exited: ", error.message);
  });
