import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LogItem } from "../components/results/LogItem";

describe("LogItem Component", () => {
  it("renders time and event message correctly", () => {
    render(<LogItem time="12:34:56" event="Voter registered in District A" />);

    expect(screen.getByText("12:34:56")).toBeInTheDocument();
    expect(screen.getByText("Voter registered in District A")).toBeInTheDocument();
  });
});
