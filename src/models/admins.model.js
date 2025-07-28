import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const adminSchema = new mongoose.Schema(
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
    isAdmin: { type: Boolean, default: true },
    avatar: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);


adminSchema.pre('save', async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password); 
}

adminSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        {
            _id: this.id,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY

        },
    )
}

adminSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            _id: this.id,
            email: this.email
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


const Admin = mongoose.model("Admin", adminSchema);
export default User;