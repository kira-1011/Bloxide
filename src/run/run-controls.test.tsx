import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunControls } from "@/run/run-controls";

const noop = () => {};

describe("RunControls", () => {
  it("reports a failed run where the running state is reported", () => {
    render(<RunControls running={false} error="steps is not defined" onRun={noop} onStop={noop} />);

    expect(screen.getByText("steps is not defined")).toBeInTheDocument();
  });

  it("puts the error ahead of the running state, so a failure is not hidden", () => {
    render(<RunControls running error="steps is not defined" onRun={noop} onStop={noop} />);

    expect(screen.queryByText("Running…")).not.toBeInTheDocument();
  });

  it("says nothing when a run has neither started nor failed", () => {
    render(<RunControls running={false} error={null} onRun={noop} onStop={noop} />);

    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});
