/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("framer-motion", () => {
  const React = require("react");
  const stripMotionProps = ({
    initial,
    animate,
    exit,
    transition,
    whileHover,
    whileTap,
    whileFocus,
    whileDrag,
    whileInView,
    viewport,
    variants,
    layout,
    layoutId,
    drag,
    dragConstraints,
    onAnimationComplete,
    custom,
    ...rest
  }: Record<string, unknown>) => rest;

  const motion = new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) =>
          React.createElement(tag, stripMotionProps(props), children),
    }
  );

  return {
    motion,
    useAnimation: () => ({ start: jest.fn().mockResolvedValue(undefined) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("canvas-confetti", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("ai/rsc", () => ({
  readStreamableValue: async function* () {},
}));

jest.mock("@/app/actions/generate-persona", () => ({
  generatePersonaDescription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/app/hooks/useSound", () => ({
  useSound: () => ({ playSound: jest.fn() }),
}));

jest.mock("@/app/components/PersonaRarityChart", () => ({
  PersonaRarityChart: () => null,
}));
jest.mock("@/app/components/ProgressIndicator", () => ({
  ProgressIndicator: () => null,
}));
jest.mock("@/app/components/MuteToggle", () => ({
  MuteToggle: () => null,
}));
jest.mock("@/app/components/NotificationPrompt", () => ({
  NotificationPrompt: () => null,
}));
jest.mock("@/app/components/PersonaEvolutionTimeline", () => ({
  PersonaEvolutionTimeline: () => null,
}));

const mockUseWrapStore = jest.fn();
jest.mock("@/app/store/wrapStore", () => ({
  useWrapStore: () => mockUseWrapStore(),
}));

jest.mock("@/app/store/notificationStore", () => ({
  useNotificationStore: () => ({ consentGiven: true, pushEnabled: true }),
}));

import ArchetypeReveal from "../page";
import { DEFAULT_ARCHETYPE_DESCRIPTION } from "@/data/archetypeConfig";

// The description below the card is revealed by a setTimeout/setInterval-based
// typewriter effect (2200ms start delay, 25ms per character). Fake timers let
// the test flush that effect deterministically instead of waiting in real time.
const flushTypewriter = (text: string) => {
  act(() => {
    jest.advanceTimersByTime(2200 + text.length * 25 + 100);
  });
};

describe("Persona page — unknown archetype fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders fallback description for an unsupported persona without throwing", () => {
    mockUseWrapStore.mockReturnValue({
      result: {
        username: "test-user",
        persona: "The Unrecognized Wanderer",
        personaDescription: undefined,
        totalTransactions: 0,
        percentile: 0,
        dapps: [],
        vibes: [],
      },
    });

    expect(() => render(<ArchetypeReveal />)).not.toThrow();

    expect(screen.getByText("The Unrecognized Wanderer")).toBeInTheDocument();

    flushTypewriter(DEFAULT_ARCHETYPE_DESCRIPTION);

    expect(
      screen.getByText(DEFAULT_ARCHETYPE_DESCRIPTION)
    ).toBeInTheDocument();
  });

  it("renders without crashing when there is no wrap result at all", () => {
    mockUseWrapStore.mockReturnValue({ result: null });

    expect(() => render(<ArchetypeReveal />)).not.toThrow();
    expect(screen.getByText("The Wizard")).toBeInTheDocument();
  });
});
