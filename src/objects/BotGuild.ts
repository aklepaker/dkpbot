/* eslint-disable @typescript-eslint/no-empty-interface */
import { Schema, Document, Model, model } from "mongoose";

const GuildSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  dkptable: Object,
  config: {
    type: Object,
    unique: true,
    required: true,
    lowercase: false
  }
});

interface GuildConfig {
  trigger: string;
}

interface GuildSchema extends Document {
  guildId: string;
  dkptable: object;
  config: GuildConfig;
}

export interface GuildObjectBase extends GuildSchema {
  //
}

export const GuildObject = model<GuildObjectBase>("Guild", GuildSchema);

export const NewGuildObject = async (): Promise<GuildObjectBase> => {
  return await GuildObject.create();
};
