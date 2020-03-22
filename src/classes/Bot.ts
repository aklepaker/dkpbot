/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, Guild, Message, Presence, ActivityOptions, ActivityType } from "discord.js";
import { connect } from "mongoose";
import { MessageHandler } from "./MessageHandler";
import { GuildObject, GuildObjectBase } from "../objects/GuildObject";
import { Parser } from "./Parser";
import { version } from "../version";
import { Metrics } from "./Metrics";
import { performance } from 'perf_hooks';

export class Bot {
  private client: Client;
  private readonly token: string;
  private parser: Parser;
  private dkp: GuildObjectBase[] = [];
  private trigger: string;
  private listeningIndex: number;
  private dbConnectionString: string;
  private metrics: Metrics;

  constructor() {
    console.info(`DKPbot v${version}`);
    this.dbConnectionString = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin`;
    this.client = new Client();
    this.token = process.env.TOKEN;
    this.parser = new Parser();
    this.trigger = "!dkpb";
    this.listeningIndex = 0;
    this.metrics = new Metrics();

  }

  /**
    Initialize the bot with data from each guild we are active in.
  */
  private async Init(): Promise<void> {
    this.client.guilds.cache.forEach(async (guild: Guild) => {
      try {
        let importGuild = null;
        let dkpTable = null;
        importGuild = await this.GetGuild(guild.id);
        if (this.parser.FileExists(guild.id)) {
          try {
            dkpTable = await this.parser.Parse(guild.id);
            importGuild.dkptable = dkpTable;
            await importGuild.save();
            this.parser.RemoveFile(guild.id);
          } catch (error) {
            // no file, skip it.
          }
        }
        this.dkp[guild.id] = importGuild;
      } catch (error) {
        const err = error as Error;
        console.error(err);
        this.dkp[guild.id] = {};
      }
    });
  }

  /**
    Init the database connections
  */
  private async InitiateDatabase(): Promise<void> {
    try {
      const result = await connect(this.dbConnectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
        useCreateIndex: true
      });
      console.info("MongoDB Connected:", result.connection.readyState === 1 ? true : false);
    } catch (error) {
      throw error;
    }
  }

  /**
    Start listening to the channels we are active in
  */
  public async listen(): Promise<string> {
    try {
      await this.InitiateDatabase();
      await this.metrics.Init();

      this.client.on("ready", () => {
        this.metrics.GuildGauge.set(this.client.guilds.cache.size);
        this.client.user.setActivity();
        this.client.setInterval(() => {
          this.client.user.setActivity(this.GetListeningActivity());
        }, 30000);
        this.Init();
      });

      this.client.on("guildCreate", async (guild: Guild) => {
        this.metrics.GuildGauge.set(this.client.guilds.cache.size);
        await this.OnGuildJoin(guild);

      });

      this.client.on("guildDelete", async (guild: Guild) => {
        this.metrics.GuildGauge.set(this.client.guilds.cache.size);
        await this.OnGuildLeave(guild);
      });

      this.client.on("message", async (message: Message) => {
        // this.ParseMessage(message);
        let pStart = 0;
        try {
          pStart = performance.now();
        } catch (error) {
          console.error(error.message);
        }
        await this.OnMessage(message);
        const pResult = performance.now() - pStart;
        this.metrics.MessageProcessTime.inc(pResult);
      });

      return this.client.login(this.token);
    } catch (error) {
      throw error;
    }
  }

  /**
    Event on leaving a guild
  */
  private async OnGuildLeave(guild: Guild): Promise<void> {
    const dbGuild = await this.GetGuild(guild.id);
    dbGuild.remove();
    console.info(`Removed from ${guild.name}`);
  }

  /**
    Event on joining a guild
  */
  private async OnGuildJoin(guild: Guild): Promise<void> {
    console.info(`Joined ${guild.name}`);
    const dbGuild = await this.GetGuild(guild.id);
    dbGuild.guildName = guild.name;
    this.dkp[guild.id] = dbGuild;
  }

  /**
    Get the current guild
  */
  private async GetGuild(guildId: string): Promise<GuildObjectBase> {
    let guild = null;

    guild = await GuildObject.findOne({ guildId }, async err => {
      if (err) {
        console.error(err);
      }
    });
    if (guild === null) {
      guild = await new GuildObject({ guildId, config: { trigger: "!dkpb" } });
    }
    return guild;
  }

  /**
    Event triggere on a new message from DM or channel
  */
  public async OnMessage(message: Message): Promise<void> {
    const handler = new MessageHandler(message, this.client, this.metrics);
    await handler.ParseMessage();
    return;
  }

  /**
    Return the text visible under the bot name
  */
  private GetListeningActivity(): ActivityOptions {
    let users = 0;
    this.client.guilds.cache.forEach(guild => {
      users += guild.memberCount;
    });
    const textArray: ActivityOptions[] = [
      { type: "WATCHING", name: `${users} users` },
      { type: "LISTENING", name: `${this.client.guilds.cache.size} servers` }
    ];
    this.listeningIndex = this.listeningIndex + 1 < textArray.length ? this.listeningIndex + 1 : 0;
    return textArray[this.listeningIndex];
  }
}
