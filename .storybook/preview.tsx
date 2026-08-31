import type { Preview } from "@storybook/nextjs";
import React, { useEffect } from "react";
import "../app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    controls: {
      matchers: {
        color: /(?abackground|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story, context) => {
      const { theme } = context.globals;
      useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("light", theme === "light");
        return () => root.classList.remove("light");
      }, [theme]);
      return (
        <div className="min-h-screen bg-[var(--color-theme-background)] p-8 text-[var(--color-foreground)]">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
