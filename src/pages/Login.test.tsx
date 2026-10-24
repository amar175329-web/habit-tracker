import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./Login";
import { AuthProvider } from "../lib/auth";

// Mock api auth
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    authApi: {
      login: vi.fn(async () => ({ ok: true })),
      me: vi.fn(async () => { throw new Error("not auth"); }),
      logout: vi.fn(async () => ({ ok: true })),
    },
  };
});

import { authApi } from "../lib/api";

function renderLogin() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders password input and login button", () => {
    renderLogin();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeInTheDocument();
  });

  it("login flow — calls authApi.login with password", async () => {
    renderLogin();
    const input = screen.getByTestId("password-input") as HTMLInputElement;
    const btn = screen.getByTestId("login-button");
    fireEvent.change(input, { target: { value: "dailyos" } });
    fireEvent.click(btn);
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith("dailyos"));
  });

  it("shows error on invalid password", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error("Invalid password"));
    renderLogin();
    const input = screen.getByTestId("password-input");
    const btn = screen.getByTestId("login-button");
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("login-error")).toBeInTheDocument());
    expect(screen.getByTestId("login-error").textContent).toContain("Invalid password");
  });
});
