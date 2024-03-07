import Aedes from "aedes";
import { createServer } from "aedes-server-factory";

const portMQTT: number = 1883;
const portWS: number = 8083;

const aedes = new Aedes();

aedes.on("clientError", (client, error) => {
  console.error("TERJADI ERROR CLIENT", error);
});
aedes.on("client", (client) => {
  console.log("Client Connect", client.id);
});
aedes.on("clientDisconnect", (client) => {
  console.log("Client Disconnect", client.id);
});
aedes.on("publish", (packet, client) => {
  console.log("Message", packet.payload.toString());
});

const httpServer = createServer(aedes, { ws: true });
const broker = createServer(aedes);

broker.listen(portMQTT, () => {
  console.log("MQTT-Broker is ready at", portMQTT);
});

httpServer.listen(portWS, () => {
  console.log("Websocket is ready at", portWS);
});
