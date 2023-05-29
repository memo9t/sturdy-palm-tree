import mongoose from "mongoose";

const TransferenciaSchema = new mongoose.Schema({
	emisor_id: mongoose.Schema.Types.ObjectId,
	receptor_id: mongoose.Schema.Types.ObjectId,
	monto: Number,
	fecha: Date,
	descripcion: String, // Campo nuevo
});

export const Transferencia = mongoose.model(
	"Transferencia",
	TransferenciaSchema
);