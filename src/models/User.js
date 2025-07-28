import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: {
      type: String,
      default: "https://via.placeholder.com/150x150/cccccc/666666?text=User",
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this.id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this.id,
      email: this.email,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

const User = mongoose.model("User", UserSchema);
export default User;
