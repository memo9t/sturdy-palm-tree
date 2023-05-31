import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Usuario from "./models/Usuario.js";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { dirname } from "path";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Cuenta } from "./models/cuenta.js";
import { Transferencia } from "./models/transferencia.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//const bodyParser = require('body-parser');

dotenv.config();
const app = express();

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", __dirname + "/views");

app.use(express.static(__dirname + "/views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

app.use(cookieParser());

function verifyToken(req, res, next) {
	const token = req.cookies.token;
	if (!token) return res.redirect("/");

	jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
		if (err)
			return res.redirect("/login");
		req.userId = decoded.id;
		next();
	});
}

app.get("/", verifyToken, (req, res) => {
	res.render("index");
});

app.get("/login", (req, res) => {
	res.render("login");
});

app.get("/register", (req, res) => {
	res.render("createUser");
});

app.get("/cuenta", verifyToken, async (req, res) => {
	const cuenta = await Cuenta.findOne({ usuario_id: req.userId });

	if (cuenta) {
		let transferenciasEmitidas = await Transferencia.find({
			emisor_id: req.userId,
		});
		let transferenciasRecibidas = await Transferencia.find({
			receptor_id: req.userId,
		});
		transferenciasEmitidas = transferenciasEmitidas.map((transferencia) =>
			transferencia.toObject()
		);
		transferenciasRecibidas = transferenciasRecibidas.map((transferencia) =>
			transferencia.toObject()
		);
		const transferencias = transferenciasEmitidas.concat(
			transferenciasRecibidas
		);
		res.render("estado", { saldo: cuenta.saldo, transferencias });
	} else {
		res.status(404).render("estado", { error: "Cuenta no encontrada" });
	}
});

app.get("/transferencia", verifyToken, (req, res) => {
	res.render("transferir");
});

app.post("/API/register", async (req, res) => {
	const { nombre, correo, contrasena} =	req.body;

	if (!nombre || !correo || !contrasena ) {
		return res.status(400).render("createUser", {
			error: "Por favor, completa todos los campos.",
		});
	}

	const nuevoUsuario = new Usuario({
		nombre,
		correo,
		contrasena,
	});

	try {
		await nuevoUsuario.save();

		const token = jwt.sign(
			{ id: nuevoUsuario._id },
			process.env.JWT_SECRET,
			{
				expiresIn: 3600, 
			}
		);

		res.cookie("token", token, { httpOnly: true });

		res.status(200).render("index", { usuario: nombre });
	} catch (err) {
		res.status(500).render("createUser", {
			error: "Hubo un problema al registrar el usuario.",
		});
	}
});

app.post("/API/login", async (req, res) => {
	let user = req.body.user;
	let pass = req.body.pass;

	if (user && pass) {s
		const usuario = await Usuario.findOne({
			usuario: user,
			contrasena: pass,
		});

		if (usuario) {
			const token = jwt.sign(
				{ id: usuario._id },
				process.env.JWT_SECRET,
				{
					expiresIn: 3600, 
				}
			);

			res.cookie("token", token, { httpOnly: true });

			res.status(200).render("index", { usuario: user });
		} else {
			res.render("login", {
				fallido: "Usuario o contraseña incorrectos.",
			});
		}
	} else {
		res.render("index");
	}
});

app.get("/API/cuenta/:id", verifyToken, async (req, res) => {
	const cuenta = await Cuenta.findOne({ usuario_id: req.params.id });
	if (cuenta) {
		res.render("estado", { saldo: cuenta.saldo });
	} else {
		res.status(404).render("estado", { error: "Cuenta no encontrada" });
	}
});

app.post("/API/transferencia", verifyToken, async (req, res) => {
	const { emisor_id, receptor_id, monto, descripcion } = req.body; // incluir descripcion

	const cuentaEmisor = await Cuenta.findOne({ usuario_id: emisor_id });
	const cuentaReceptor = await Cuenta.findOne({ usuario_id: receptor_id });

	if (!cuentaEmisor) {
		return res.status(404).render("transferir", {
			error: "Cuenta del emisor no encontrada",
		});
	}
	if (!cuentaReceptor) {
		return res.status(404).render("transferir", {
			error: "Cuenta del receptor no encontrada",
		});
	}
	if (cuentaEmisor.saldo < monto) {
		return res.status(400).render("transferir", {
			error: "Saldo insuficiente en la cuenta del emisor",
		});
	}

	cuentaEmisor.saldo -= monto;
	cuentaReceptor.saldo += monto;
	await cuentaEmisor.save();
	await cuentaReceptor.save();

	const transferencia = new Transferencia({
		emisor_id,
		receptor_id,
		monto,
		fecha: new Date(),
		descripcion, 
	});
	await transferencia.save();

	res.status(200).render("estado", {
		message: "Transferencia realizada con éxito",
	});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});