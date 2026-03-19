const PLUGIN_ID = "jinyiwei";

export const id = PLUGIN_ID;

export default function register(api) {
  api.registerGatewayMethod(`${PLUGIN_ID}.status`, ({ respond }) => {
    respond(true, {
      id: PLUGIN_ID,
      enabled: true,
      bossTitle: "Boss",
      watchSelfTitle: "锦衣卫",
      externalIngressAgents: ["ChatAgent", "WatchAgent"],
      externalChannels: ["feishu", "telegram"],
      message: "Jinyiwei is active. Only ChatAgent and WatchAgent may access external channels."
    });
  });
}
