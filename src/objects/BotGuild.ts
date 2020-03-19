/* eslint-disable @typescript-eslint/no-empty-interface */
import { Schema, Document, Model, model } from "mongoose";

const GuildSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true
    },
    guildName: {
      type: String,
      unique: false,
      required: false
    },
    dkptable: Schema.Types.Mixed,
    config: Schema.Types.Mixed
  },
  { typePojoToMixed: false }
);

interface GuildConfig {
  trigger: string;
}

interface GuildSchema extends Document {
  guildId: string;
  guildName: string;
  dkptable: Record<string, any>;
  config: GuildConfig;
}

export interface GuildObjectBase extends GuildSchema {
  //
}

export const GuildObject = model<GuildObjectBase>("Guild", GuildSchema);

export const NewGuildObject = async (): Promise<GuildObjectBase> => {
  return await GuildObject.create();
};
