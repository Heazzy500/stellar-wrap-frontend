import type { Meta, StoryObj } from "@storybook/nextjs";
import { Tooltip } from "./Tooltip";
import React from "react";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "disabled", "loading"],
      description: "Visual appearance style and state",
    },
    position: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
      description: "Position of the tooltip relative to trigger",
    },
    delay: {
      control: "number",
      description: "Delay before showing tooltip in ms",
    },
    disabled: {
      control: "boolean",
      description: "Whether the tooltip is disabled",
    },
    content: {
      control: "text",
      description: "Content displayed inside the tooltip",
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    position: "top",
    content: "Primary tooltip action",
    children: (
      <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow">
        Hover Me (Primary)
      </button>
    ),
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    position: "top",
    content: "Secondary helper information",
    children: (
      <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg border border-zinc-700">
        Hover Me (Secondary)
      </button>
    ),
  },
};

export const Disabled: Story = {
  args: {
    variant: "disabled",
    position: "top",
    content: "This action is currently unavailable",
    children: (
      <button className="px-4 py-2 bg-zinc-800 text-zinc-500 text-sm font-semibold rounded-lg border border-zinc-800 cursor-not-allowed">
        Hover Me (Disabled)
      </button>
    ),
  },
};

export const Loading: Story = {
  args: {
    variant: "loading",
    position: "top",
    content: "Fetching Stellar balance...",
    children: (
      <button className="px-4 py-2 bg-zinc-900 text-zinc-300 text-sm font-semibold rounded-lg border border-zinc-700">
        Hover Me (Loading)
      </button>
    ),
  },
};

export const BottomPosition: Story = {
  args: {
    variant: "primary",
    position: "bottom",
    content: "Tooltip displayed on bottom",
    children: (
      <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow">
        Bottom Position
      </button>
    ),
  },
};

export const LeftPosition: Story = {
  args: {
    variant: "secondary",
    position: "left",
    content: "Tooltip displayed on left",
    children: (
      <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg border border-zinc-700">
        Left Position
      </button>
    ),
  },
};

export const RightPosition: Story = {
  args: {
    variant: "secondary",
    position: "right",
    content: "Tooltip displayed on right",
    children: (
      <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg border border-zinc-700">
        Right Position
      </button>
    ),
  },
};
