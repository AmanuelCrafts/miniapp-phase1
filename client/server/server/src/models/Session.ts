import mongoose, { Schema, model, type InferSchemaType, type Model, type Types } from 'mongoose';

/**
 * `mongoose.models` has to be read off the default export.
 *
 * Mongoose is CommonJS and assigns `models` at runtime, so Node's static
 * named-export detection cannot see it. A named import would throw under
 * native ESM even though it works under a bundler's interop shim.
 */
const { models } = mongoose;

/**
 * Server side session record.
 *
 * Why a database backed session instead of a stateless signed cookie:
 *
 * 1. Instant revocation. `POST /api/auth/logout` (or a future admin ban) can
 *    destroy the record, which a self contained cookie cannot do.
 * 2. No blast radius from cookie size limits once later phases attach richer
 *    claims to the session.
 * 3. Auditable: we can see how many live sessions an account has.
 *
 * Only a SHA-256 digest of the session token is persisted, so a database leak
 * does not hand out usable session cookies. A MongoDB TTL index removes
 * expired documents automatically.
 */
const sessionSchema = new Schema(
  {
    // `index: true` emits the `userId_1` index, used to revoke every session
    // of a user.
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /**
     * SHA-256 of the raw session token (hex). The raw token never touches the
     * DB. `unique: true` here emits the `tokenHash_1` unique index.
     */
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
      maxlength: 512,
    },
    /** Hashed client IP for abuse investigation without storing raw addresses. */
    ipHash: {
      type: String,
      trim: true,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'sessions',
  },
);

// MongoDB removes the document once `expiresAt` passes.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' });

export type SessionShape = InferSchemaType<typeof sessionSchema>;
export type SessionDocument = SessionShape & { _id: Types.ObjectId };

export const SessionModel: Model<SessionShape> =
  (models.Session as Model<SessionShape> | undefined) ?? model<SessionShape>('Session', sessionSchema);
