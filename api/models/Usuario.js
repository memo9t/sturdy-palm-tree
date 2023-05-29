import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    password: String,
})

export default mongoose.model("usuario", userSchema);