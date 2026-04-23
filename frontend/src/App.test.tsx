import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App Component UI", () => {
  it("renders the Suspense loading fallback initially due to chunk splitting", () => {
    render(<App />);
    const fallback = screen.getByText(/loading module\.\.\./i);
    expect(fallback).toBeInTheDocument();
  });
});