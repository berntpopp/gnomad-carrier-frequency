<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Customize the clinical text templates. Use the toolbar to insert dynamic
      variables.
    </p>

    <!-- Language selector -->
    <v-btn-toggle
      v-model="templateStore.language"
      color="primary"
      density="compact"
      mandatory
      class="mb-4"
    >
      <v-btn value="de">German</v-btn>
      <v-btn value="en">English</v-btn>
    </v-btn-toggle>

    <TemplateEditor />

    <!-- Import/Export/Reset buttons -->
    <v-divider class="my-4" />

    <div class="d-flex flex-wrap ga-2">
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-download"
        @click="handleExportTemplates"
      >
        Export Templates
      </v-btn>

      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-upload"
        @click="fileInputRef?.click()"
      >
        Import Templates
      </v-btn>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleImportTemplates"
      />

      <v-btn
        variant="outlined"
        size="small"
        color="warning"
        prepend-icon="mdi-restore"
        @click="handleResetLanguage"
      >
        Reset
        {{ templateStore.language === "de" ? "German" : "English" }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useConfirmDialog } from "@/composables";
import TemplateEditor from "@/components/TemplateEditor.vue";

const templateStore = useTemplateStore();
const { ask } = useConfirmDialog();
const fileInputRef = ref<HTMLInputElement | null>(null);

function handleExportTemplates() {
  const data = templateStore.exportTemplates();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `templates_${data.language}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleImportTemplates(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Reset file input before reading to prevent holding the file input open
  input.value = "";

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);

      // Validate structure without applying yet
      if (
        !data ||
        typeof data !== "object" ||
        !data.version ||
        !data.language ||
        !data.customSections ||
        !data.enabledSections
      ) {
        await ask({
          title: "Import Error",
          message: "Invalid template file format.",
          confirmText: "OK",
          cancelText: "",
        });
        return;
      }

      // Build summary for confirmation
      const langName = data.language === "de" ? "German" : "English";
      const sectionCount = Object.values(
        data.enabledSections as Record<string, string[]>,
      ).flat().length;

      const confirmed = await ask({
        title: "Import Templates",
        message: `Import ${langName} templates with ${sectionCount} enabled sections?`,
        confirmText: "Import",
        cancelText: "Cancel",
        confirmColor: "primary",
      });

      if (confirmed) {
        templateStore.importTemplates(data);
      }
    } catch {
      await ask({
        title: "Import Error",
        message: "Failed to parse template file.",
        confirmText: "OK",
        cancelText: "",
      });
    }
  };
  reader.readAsText(file);
}

async function handleResetLanguage() {
  const langName = templateStore.language === "de" ? "German" : "English";
  const confirmed = await ask({
    title: "Reset Templates",
    message: `This will reset all ${langName} templates to defaults. This cannot be undone.`,
    confirmText: "Yes, reset",
    cancelText: "Keep current",
    confirmColor: "error",
  });
  if (confirmed) {
    templateStore.resetLanguageTemplates(templateStore.language);
  }
}
</script>
