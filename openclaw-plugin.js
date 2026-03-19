const PLUGIN_ID = "jinyiwei";

const DEFAULTS = {
  bossTitle: "Boss",
  watchSelfTitle: "锦衣卫",
  approvalMode: "hybrid",
  externalIngressAgents: ["ChatAgent", "WatchAgent"],
  externalChannels: ["feishu", "telegram"],
  autoInstallListedSkills: true,
  listedSkillsManifest: "manifests/preinstalled-skills.json",
};

export const id = PLUGIN_ID;

export default function register(api) {
  const cfg = api.getConfig?.() ?? {};

  const bossTitle = cfg.bossTitle ?? DEFAULTS.bossTitle;
  const watchSelfTitle = cfg.watchSelfTitle ?? DEFAULTS.watchSelfTitle;
  const approvalMode = cfg.approvalMode ?? DEFAULTS.approvalMode;
  const externalIngressAgents = cfg.externalIngressAgents ?? DEFAULTS.externalIngressAgents;
  const externalChannels = cfg.externalChannels ?? DEFAULTS.externalChannels;
  const autoInstallListedSkills = cfg.autoInstallListedSkills ?? DEFAULTS.autoInstallListedSkills;
  const listedSkillsManifest = cfg.listedSkillsManifest ?? DEFAULTS.listedSkillsManifest;

  api.registerGatewayMethod(`${PLUGIN_ID}.status`, ({ respond }) => {
    respond(true, {
      id: PLUGIN_ID,
      enabled: true,
      bossTitle,
      watchSelfTitle,
      approvalMode,
      externalIngressAgents,
      externalChannels,
      autoInstallListedSkills,
      listedSkillsManifest,
      message: `Jinyiwei is active. Only ${externalIngressAgents.join(" and ")} may access external channels.`
    });
  });
}
