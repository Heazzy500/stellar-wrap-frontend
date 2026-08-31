import type { Meta, StoryObj } from "@storybook/nextjs";
import { ReceiveModal } from "./ReceiveModal";
import { useWrapStore } from "../store/wrapStore";
import { NETWORKS } from "../../src/config";
import { withStore } from "../../.storybook/withStore";
import React, { useState } from "react";

function ModalWrapper(args: React.ComponentProps<typeof ReceiveModal>) {
  const [isOpen, setIsOpen] = useState(args.isOpen ?? true);
  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow"
      >
        Open Receive Modal
      </button>
      <ReceiveModal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

const meta = {
  title: "Components/ReceiveModal",
  component: ModalWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ModalWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultConnected: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    address: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA",
    network: "MAINNET",
  },
};

export const Testnet: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    address: "GBDEVTESTNETSAMPLEADDRESSFORSTELLARRECEIVEMODAL12345",
    network: "TESTNET",
  },
};

export const EmptyStateDisconnected: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    address: "",
  },
  decorators: [withStore(useWrapStore, { address: null })],
};
