const PLUGIN_ID = "jinyiwei";

const DEFAULTS = {
  bossTitle: "Boss",
  watchSelfTitle: "锦衣卫",
  externalIngressAgents: ["ChatAgent", "WatchAgent"],
  externalChannels: ["feishu", "telegram"],
};

export const id = PLUGIN_ID;

export default function register(api) {
  const cfg = api.getConfig?.() ?? {};

  const bossTitle = cfg.bossTitle ?? DEFAULTS.bossTitle;
  const watchSelfTitle = cfg.watchSelfTitle ?? DEFAULTS.watchSelfTitle;
  const externalIngressAgents = cfg.externalIngressAgents ?? DEFAULTS.externalIngressAgents;
  const externalChannels = cfg.externalChannels ?? DEFAULTS.externalChannels;

  api.registerGatewayMethod(`${PLUGIN_ID}.status`, ({ respond }) => {
    respond(true, {
      id: PLUGIN_ID,
      enabled: true,
      bossTitle,
      watchSelfTitle,
      externalIngressAgents,
      externalChannels,
      message: `Jinyiwei is active. Only ${externalIngressAgents.join(" and ")} may access external channels.`
    });
  });
}
