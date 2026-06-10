import { Framework, type FrameworkType } from "@/lib/constants";

function getReactEmbedScript(botId: string, appUrl: string): string {
  return `<script 
  src="${appUrl}/widget.js"
  data-bot-id="${botId}"
  data-base-url="${appUrl}"
  id="vielora-script"
  defer
></script>`;
}

function getVueEmbedScript(botId: string, appUrl: string): string {
  return `import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "${appUrl}/widget.js";
  script.setAttribute("data-bot-id", "${botId}");
  script.setAttribute("data-base-url", "${appUrl}");
  script.id = "vielora-script";
  script.defer = true;
  document.body.appendChild(script);
});`;
}

function getPhpEmbedScript(botId: string, appUrl: string): string {
  return `<!-- Thêm trước </body> trong file layout chính -->
<script
  src="${appUrl}/widget.js"
  data-bot-id="<?php echo '${botId}'; ?>"
  data-base-url="${appUrl}"
  id="vielora-script"
  defer
></script>`;
}

function getGtmEmbedScript(botId: string, appUrl: string): string {
  return `<script>
  (function() {
    if (document.getElementById("vielora-script")) return;

    var script = document.createElement("script");
    script.src = "${appUrl}/widget.js";
    script.id = "vielora-script";
    script.setAttribute("data-bot-id", "${botId}");
    script.setAttribute("data-base-url", "${appUrl}");
    script.defer = true;
    
    document.body.appendChild(script);
  })();
</script>`;
}

export function getEmbededScript(botId: string, appUrl: string, framework: FrameworkType): string {
  if (framework === Framework.REACT) {
    return getReactEmbedScript(botId, appUrl);
  } else if (framework === Framework.VUE) {
    return getVueEmbedScript(botId, appUrl);
  } else if (framework === Framework.PHP) {
    return getPhpEmbedScript(botId, appUrl);
  } else if (framework === Framework.GTM) {
    return getGtmEmbedScript(botId, appUrl);
  } else {
    throw new Error("Unsupported framework");
  }
}
