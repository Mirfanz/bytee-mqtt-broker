import { PrismaClient } from "@prisma/client";
import Aedes from "aedes";
import { createServer } from "aedes-server-factory";
const portMQTT: number = 1883;
const portWS: number = 8083;

const aedes = new Aedes();

const prisma = new PrismaClient();

type parsedTopicType = {
  deviceId: string;
  isDevice: boolean;
  isGetState: boolean;
};
function parseTopic(topic: string): parsedTopicType {
  const data = {} as parsedTopicType;
  const arrayTopic = topic.split("/");
  data.isDevice = arrayTopic[1] === "device";
  data.deviceId = arrayTopic[2];

  return data;
}

aedes.on("client", (client) => {
  console.log("New Client: ", client.id);
  console.log("Client Count: ", aedes.connectedClients);
});

aedes.on("clientDisconnect", (client) => {
  console.log("Client Disconnect : ", client.id);
});

aedes.on("subscribe", (subscriptions, client) => {
  console.log("subscriptions", subscriptions);
  subscriptions.forEach((item) => {
    const { deviceId, isDevice } = parseTopic(item.topic);
    if (isDevice) {
      aedes.publish(
        {
          cmd: "publish",
          topic: `bytee/web/${deviceId}/state`,
          payload: "5",
          qos: 0,
          dup: false,
          retain: false,
        },
        (error) => {
          if (error) console.log("error", error);
          console.log("to web : 5");
        }
      );
      prisma.device
        .update({
          where: { id: deviceId },
          data: {
            active: true,
          },
        })
        .then((data) => {
          console.log(`# Online <${data.id}>`);
        })
        .catch((error) => {
          console.log("Error saat mengubah device online");
        });
    }
  });
});

aedes.on("unsubscribe", (unsubscriptions, client) => {
  console.log("unsubscribtions", unsubscriptions);
  unsubscriptions.forEach((item) => {
    const { deviceId, isDevice } = parseTopic(item);
    if (isDevice) {
      aedes.publish(
        {
          cmd: "publish",
          topic: `bytee/web/${deviceId}/state`,
          payload: "4",
          qos: 0,
          dup: false,
          retain: false,
        },
        (error) => {
          if (error) console.log("error", error);
          console.log("to web : 4");
        }
      );
      prisma.device
        .update({
          where: { id: deviceId },
          data: {
            active: false,
          },
        })
        .then((data) => {
          console.log(`# Offline <${data.id}>`);
        })
        .catch((error) => {
          console.log("Error saat mengubah data device offline");
        });
    }
  });
});

aedes.on("publish", (packet, client) => {
  const { deviceId, isDevice } = parseTopic(packet.topic);
  const message = packet.payload.toString();
  console.log("isDevice :", isDevice);

  if (message === "0" || message === "1") {
    const newState = message === "1";

    if (!isDevice)
      prisma.device
        .update({
          where: { id: deviceId, active: true },
          data: {
            state: newState,
          },
        })
        .then((data) => {
          console.log(`# ${newState ? "1" : "0"} <${data.id}>`);
        })
        .catch((error) => {
          console.log("Error saat mengubah data device status");
        });
  }
});

const httpServer = createServer(aedes, { ws: true });
const broker = createServer(aedes);

broker.listen(portMQTT, () => {
  console.log("MQTT-Broker is ready at", portMQTT);
});

httpServer.listen(portWS, () => {
  console.log("Websocket is ready at", portWS);
});
