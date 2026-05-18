import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { StatCard } from "../components/results/StatCard";

describe("StatCard Component", () => {
  it("renders title, value, and subtext correctly", () => {
    render(
      <StatCard
        title="Registered Voters"
        value={15200}
        sub="+12% from last election"
        icon={<span data-testid="mock-icon">📊</span>}
      />
    );

    expect(screen.getByText("Registered Voters")).toBeInTheDocument();
    expect(screen.getByText("15200")).toBeInTheDocument();
    expect(screen.getByText("+12% from last election")).toBeInTheDocument();
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });
});
