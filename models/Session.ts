import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export interface SessionDocument extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  /** SHA-256(token + SESSION_SECRET). Raw tokens are never persisted. */
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, collection: "sessions" },
);

// MongoDB TTL cleanup: expired sessions are removed automatically.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session: Model<SessionDocument> =
  models.Session ?? model<SessionDocument>("Session", SessionSchema);

export default Session;
