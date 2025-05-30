import 'dotenv/config'
import { MercadoPagoConfig, Order } from "mercadopago";

const client = new MercadoPagoConfig({
	accessToken: process.eventNames.accessToken,
	options: { timeout: 5000 },
});


const order = new Order(client);

const body = {
	type: "online",
	processing_mode: "automatic",
	total_amount: "1000.00",
	external_reference: "ext_ref_1234",
	payer: {
		email: "pedro@gmail.com",
	},
	transactions: {
		payments: [
			{
				amount: "1000.00",
				payment_method: {
					id: "master",
					type: "credit_card",
					token: "764993876513",
					installments: 1,
					statement_descriptor: "Cervejaria Virada",
				},
			},
		],
	},
};

order.create({ body }).then(console.log).catch(console.error);